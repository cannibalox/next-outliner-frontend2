import type { BlockId } from "@/common/types";
import { useEventBus } from "@/plugins/eventbus";
import { createContext } from "@/utils/createContext";
import { ref, shallowReactive } from "vue";
import BlocksContext from "./blocks-provider/blocks";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import MiniSearch, { type Query, type SearchOptions } from "minisearch";
import { ngramSplit, tokenize } from "@/utils/tokenize";

const IndexContext = createContext(() => {
  const eventBus = useEventBus();
  const { blocksManager } = BlocksContext.useContext();

  //////// Mirrors, Virtuals, Occurs ////////
  const mirrors = shallowReactive(new Map<BlockId, Set<BlockId>>());
  const virtuals = shallowReactive(new Map<BlockId, Set<BlockId>>());

  const _addMirror = (
    srcBlockId: BlockId,
    mirrorBlockId: BlockId,
    _mirrors?: Map<BlockId, Set<BlockId>>,
  ) => {
    _mirrors = _mirrors || mirrors;
    const set = _mirrors.get(srcBlockId);
    if (set) set.add(mirrorBlockId);
    else _mirrors.set(srcBlockId, new Set([mirrorBlockId]));
  };

  const _addVirtual = (
    srcBlockId: BlockId,
    virtualBlockId: BlockId,
    _virtuals?: Map<BlockId, Set<BlockId>>,
  ) => {
    _virtuals = _virtuals || virtuals;
    const set = _virtuals.get(srcBlockId);
    if (set) set.add(virtualBlockId);
    else _virtuals.set(srcBlockId, new Set([virtualBlockId]));
  };

  const _deleteMirror = (
    srcBlockId: BlockId,
    mirrorBlockId: BlockId,
    _mirrors?: Map<BlockId, Set<BlockId>>,
  ) => {
    _mirrors = _mirrors || mirrors;
    const set = _mirrors.get(srcBlockId);
    if (set) {
      set.delete(mirrorBlockId);
      if (set.size == 0) _mirrors.delete(srcBlockId);
    }
  };

  const _deleteVirtual = (
    srcBlockId: BlockId,
    virtualBlockId: BlockId,
    _virtuals?: Map<BlockId, Set<BlockId>>,
  ) => {
    _virtuals = _virtuals || virtuals;
    const set = _virtuals.get(srcBlockId);
    if (set) {
      set.delete(virtualBlockId);
      if (set.size == 0) _virtuals.delete(srcBlockId);
    }
  };

  const getMirrors = (blockId: BlockId): Set<BlockId> => {
    return mirrors.get(blockId) ?? new Set();
  };

  const getVirtuals = (blockId: BlockId): Set<BlockId> => {
    return virtuals.get(blockId) ?? new Set();
  };

  const getOccurs = (blockId: BlockId, includeSelf: boolean = true) => {
    const ret = [];
    ret.push(...getMirrors(blockId));
    ret.push(...getVirtuals(blockId));
    if (includeSelf) ret.push(blockId);
    return ret;
  };

  eventBus.on("afterBlocksTrCommit", ([tr]) => {
    for (let i = 0; i < tr.patches.length; i++) {
      const patch = tr.patches[i];
      const reversePatch = tr.reversePatches[i];
      if (patch.op === "add") {
        const b = patch.block;
        if (b.type === "mirrorBlock") _addMirror(b.src, b.id);
        else if (b.type === "virtualBlock") _addVirtual(b.src, b.id);
      } else if (patch.op === "delete" && reversePatch.op === "add") {
        const b = reversePatch.block;
        if (b.type === "mirrorBlock") _deleteMirror(b.src, b.id);
        else if (b.type === "virtualBlock") _deleteVirtual(b.src, b.id);
      }
    }
  });

  eventBus.on("blocksDestroy", () => {
    mirrors.clear();
    virtuals.clear();
  });

  /////////// Backlinks ///////////
  const backlinksIndex = ref<Record<BlockId, Set<BlockId>>>({});

  eventBus.on("afterBlocksTrCommit", ([tr]) => {
    for (let i = 0; i < tr.patches.length; i++) {
      const patch = tr.patches[i];
      const reversePatch = tr.reversePatches[i];
      if (patch.op === "delete") {
        delete backlinksIndex.value[patch.blockId];
        if (reversePatch.op !== "add") continue;
        const block = reversePatch.block;
        if (block.type !== "normalBlock" || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT) continue;
        const olinks = blocksManager.getOlinks(block.content[1]);
        for (const olink of olinks) {
          backlinksIndex.value[olink]?.delete(block.id);
        }
      } else if (patch.op === "add" || patch.op === "update") {
        const block = patch.block;
        const oldOlinks =
          reversePatch.op === "delete"
            ? []
            : reversePatch.block.type !== "normalBlock" ||
                reversePatch.block.content[0] !== BLOCK_CONTENT_TYPES.TEXT
              ? []
              : blocksManager.getOlinks(reversePatch.block.content[1]);
        if (block.type !== "normalBlock" || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT) continue;
        const newOlinks = blocksManager.getOlinks(block.content[1]);
        const addedOlinks = newOlinks.filter((olink) => !oldOlinks.includes(olink));
        const removedOlinks = oldOlinks.filter((olink) => !newOlinks.includes(olink));
        for (const olink of addedOlinks) {
          backlinksIndex.value[olink] = (backlinksIndex.value[olink] ?? new Set()).add(block.id);
        }
        for (const olink of removedOlinks) {
          backlinksIndex.value[olink]?.delete(block.id);
        }
      }
    }
  });

  eventBus.on("blocksDestroy", () => {
    backlinksIndex.value = {};
  });

  /////////// Fulltext Search ///////////

  const NGRAMS_CJK = [1, 2, 3, 4, 5];
  const NGRAM_MAP = NGRAMS_CJK.reduce(
    (acc, ngram) => {
      acc[`cjk${ngram}`] = ngram;
      return acc;
    },
    {} as Record<string, number>,
  );

  const fulltextIndex = new MiniSearch({
    fields: ["nonCjk", ...NGRAMS_CJK.map((ngram) => `cjk${ngram}`)],
    storeFields: ["id", "nTokens"],
    tokenize: (text) => [text], // 插入时就是分好词的，不用再分词了
  });
  const dirtySet = new Set<BlockId>();

  eventBus.on("afterBlocksTrCommit", ([tr]) => {
    for (const patch of tr.patches) {
      if (patch.op === "delete") {
        dirtySet.add(patch.blockId);
      } else {
        dirtySet.add(patch.block.id);
      }
    }
  });

  eventBus.on("blocksDestroy", () => {
    dirtySet.clear();
    fulltextIndex.removeAll();
  });

  const _updateIndex = () => {
    if (dirtySet.size === 0) return;
    for (const blockId of dirtySet) {
      const block = blocksManager.getBlock(blockId);
      // 这个块被删除了
      if (block == null && fulltextIndex.has(blockId)) {
        fulltextIndex.discard(blockId);
      } else if (block && block.type === "normalBlock") {
        if (fulltextIndex.has(blockId)) fulltextIndex.discard(blockId);
        const ctextAndMtext = block.ctext + " " + block.mtext;
        const { nonCjkTokens, cjkTokens } = tokenize(ctextAndMtext);
        const obj = {
          id: blockId,
          nonCjk: nonCjkTokens,
          nTokens: nonCjkTokens.length + cjkTokens.length,
        } as any;
        for (const ngram of NGRAMS_CJK) {
          obj[`cjk${ngram}`] = cjkTokens.flatMap((t) => ngramSplit(t, ngram));
        }
        fulltextIndex.add(obj);
      }
    }
    dirtySet.clear();
  };

  const search = (query: string, limit: number = 50) => {
    _updateIndex();

    const { nonCjkTokens, cjkTokens } = tokenize(query);

    // 计算 query 有哪些 ngram
    // 比如：query = "你好 世界" 只有 ngram=2
    // 比如：query = "你好 阿根廷" 有 ngram=2 和 ngram=3
    // 比如：query = "北京奥运会" 有 ngram=5
    const queryNgrams = new Set(cjkTokens.map((t) => t.length));
    const queries: Query[] = [];

    // 搜索非中文字符时启用前缀搜索
    if (nonCjkTokens.length > 0) {
      queries.push({ combineWith: "AND", queries: nonCjkTokens, fields: ["nonCjk"], prefix: true });
    }

    // 搜索中文字符时不启用前缀搜索，因为已经按 ngram 划分了
    for (const ngram of queryNgrams) {
      queries.push({
        combineWith: "AND",
        queries: cjkTokens.filter((t) => t.length === ngram),
        fields: [`cjk${ngram}`],
      });
    }

    let results = fulltextIndex
      .search(
        {
          combineWith: "AND",
          queries,
        },
        {
          tokenize: (text) => [text], // 不需要再分词
        },
      )
      .slice(0, limit);

    results = results.sort((a, b) => {
      const scoreA = Object.keys(a.match).length / a.nTokens;
      const scoreB = Object.keys(b.match).length / b.nTokens;
      return scoreB - scoreA;
    });

    return results;
  };

  const ctx = {
    fulltextIndex,
    backlinksIndex,
    search,
    getMirrors,
    getVirtuals,
    getOccurs,
  };
  globalThis.getIndexContext = () => ctx;
  return ctx;
});

export default IndexContext;
