import type { BlockId } from "@/common/types";
import { useEventBus } from "@/plugins/eventbus";
import { createContext } from "@/utils/createContext";
import { ref, shallowReactive } from "vue";
import BlocksContext from "./blocks-provider/blocks";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import MiniSearch, { type SearchOptions } from "minisearch";

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

  const fulltextIndex = new MiniSearch({
    fields: ["ctext", "mtext"],
    storeFields: ["id"],
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
        fulltextIndex.add(block);
      }
    }
    dirtySet.clear();
  };

  const search = (query: string, opts: SearchOptions = { prefix: true }) => {
    _updateIndex();
    return fulltextIndex.search(query, opts);
  };

  const ctx = {
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
