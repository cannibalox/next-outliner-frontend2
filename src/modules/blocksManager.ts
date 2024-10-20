import { calcBlockStatus, extractBlockStatus } from "@/common/block";
import {
  type BlockContent,
  type BlockId,
  type Block,
  type BlockWithLevel,
  type MirrorBlock,
  type NormalBlock,
  type VirtualBlock,
} from "@/common/types";
import { autoRetryGet } from "@/utils/auto-retry";
import { textContentFromString } from "@/utils/pm";
import { nanoid } from "nanoid";
import { ref, type Ref, shallowReactive, type ShallowRef, shallowRef, watch } from "vue";
import { defineModule } from "../common/module";
import { eventBus } from "./eventBus";
import { settings } from "./settings";
import { taskQueue } from "./taskQueue";
import type { BlockData, BlockInfo } from "./types";
import { yjsManager, type YjsLayerTransaction } from "./YjsManager";
import { useDebounceFn } from "@vueuse/core";
import * as Y from "yjs";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";

export type AddBlockParams = {
  id: BlockId;
  fold: boolean;
  parentId: BlockId;
  childrenIds: BlockId[];
} & (
  | { type: "normalBlock"; content: BlockContent; metadata: Record<string, any> }
  | { type: "mirrorBlock"; src: BlockId }
  | { type: "virtualBlock"; src: BlockId; childrenCreated: boolean }
);

export type BlockPatch =
  | { op: "add"; block: AddBlockParams }
  | { op: "update"; block: AddBlockParams }
  | { op: "delete"; blockId: BlockId; docId?: number };

export type BlockTransaction = {
  origin: any;
  patches: BlockPatch[];
  reversePatches: BlockPatch[];
  addBlock: <T extends AddBlockParams>(block: T) => BlockTransaction;
  updateBlock: <T extends AddBlockParams>(block: T) => BlockTransaction;
  deleteBlock: (blockId: BlockId) => BlockTransaction;
  commit: () => void;
  setOrigin: (origin: any) => BlockTransaction;
};

export type ForDescendantsOptions = {
  onEachBlock: (
    block: BlockWithLevel,
    ignore?: "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants",
  ) => void | Promise<void>;
  rootBlockId: BlockId;
  afterLeavingChildrens?: (block: Block) => void | Promise<void>;
  rootBlockLevel?: number;
  nonFoldOnly?: boolean;
  includeSelf?: boolean;
  ignore?: (
    block: BlockWithLevel,
  ) => "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants";
};

const BLOCK_DATA_MAP_NAME = "blockData";

const _toBlockParams = <T extends AddBlockParams>(block: T): AddBlockParams => {
  if (block.type == "normalBlock") {
    return {
      type: "normalBlock",
      id: block.id,
      fold: block.fold,
      parentId: block.parentId,
      childrenIds: block.childrenIds,
      content: block.content,
      metadata: block.metadata,
    };
  } else if (block.type == "mirrorBlock") {
    return {
      type: block.type,
      id: block.id,
      fold: block.fold,
      parentId: block.parentId,
      childrenIds: block.childrenIds,
      src: block.src,
    };
  } else if (block.type == "virtualBlock") {
    return {
      type: block.type,
      id: block.id,
      fold: block.fold,
      parentId: block.parentId,
      childrenIds: block.childrenIds,
      src: block.src,
      childrenCreated: block.childrenCreated,
    };
  }
  throw new Error("Invalid block type");
};

// 数据流向：
//
// 1. UI -> 后端
//   UI 创建并提交 blockTransaction
//   blockTransaction commit 时调用 _upsertBlock / _deleteBlock 更改 blocks (in blocksManager)
//   blocks 改变时将数据推送到 yjs 层，并更新索引 <------------------------------------------+
//   yjs 层将数据同步到后端                                                                 |
//                                                                                         |
// 2. 后端 -> UI                                                                           |
//   yjs 层从后端接受数据                                                                   |
//   yjs 层改变时，调用 _upsertBlock / _deleteBlock 更改 blocks (in blocksManager)  ----x---+
//   响应式 UI 根据 blocks 改变自动更新
//
// 重要结论：
// 1. 监听到 yjs 层改变时，应该判断改变的来源，如果是自己，则应该丢弃。因为 UI -> 后端过程中，
//    将数据推送到 yjs 层前，已经更新了 blocks。yjs 层的数据不一定是最新的。
// 2. 后端 -> UI 时，应该使用推模式而非拉模式，因为拉模式可能拉到的是过时的数据，而我们无从判断。
//    而推模式仅在收到数据时才触发监听器，并且能通过 origin 判断数据是否来自自己，防止将自己更新回
//    过时的状态。
export const blocksManager = defineModule(
  "blocksManager",
  { yjsManager, settings, taskQueue, eventBus },
  ({ yjsManager, settings, taskQueue, eventBus }) => {
    const { baseDoc, blockInfoMap } = yjsManager;

    const blocks = new Map<BlockId, ShallowRef<Block | null>>();
    // 记录所有自旋任务，因为可能需要手工取消
    // 比如对于一个自旋获取块数据的任务，如果监听到块加载事件，就可以取消它了
    // 至于为什么不只监听块加载事件，就当作是没事干吧
    const retryTasks = {
      getBlockInfo: new Map<BlockId, [Promise<BlockInfo>, () => void]>(), // 所有自旋获取块信息的任务
      getBlockData: new Map<BlockId, [Promise<BlockData>, () => void]>(), // 所有自旋获取块数据的任务
    };
    const mirrors = shallowReactive(new Map<BlockId, Set<BlockId>>());
    const virtuals = shallowReactive(new Map<BlockId, Set<BlockId>>());

    const _fromBlockParams = (blockParams: AddBlockParams): Block | null => {
      if (blockParams.type == "normalBlock") {
        const ret: NormalBlock = {
          type: "normalBlock",
          id: blockParams.id,
          parentId: blockParams.parentId,
          parentRef: getBlockRef(blockParams.parentId),
          childrenIds: blockParams.childrenIds,
          childrenRefs: blockParams.childrenIds.map((id) => getBlockRef(id)),
          fold: blockParams.fold,
          deleted: false,
          content: blockParams.content,
          ctext: getCtext(blockParams.content),
          metadata: blockParams.metadata,
          mtext: getMtext(blockParams.metadata),
          olinks: [],
          boosting: 0,
          acturalSrc: blockParams.id,
          docId: 0, // TODO decide which docId to use
        } as const;
        return ret;
      } else if (blockParams.type == "mirrorBlock") {
        const srcBlock = getBlockRef(blockParams.src).value;
        if (!srcBlock) {
          // XXX maybe move to autoRetryGet?
          console.error(`mirror block ${blockParams.id} 的源块 ${blockParams.src} 不存在`);
          return null;
        }
        const ret: MirrorBlock = {
          type: "mirrorBlock",
          id: blockParams.id,
          parentId: blockParams.parentId,
          parentRef: getBlockRef(blockParams.parentId),
          childrenIds: blockParams.childrenIds,
          childrenRefs: blockParams.childrenIds.map((id) => getBlockRef(id)),
          fold: blockParams.fold,
          deleted: false,
          content: srcBlock.content,
          ctext: srcBlock.ctext,
          metadata: srcBlock.metadata,
          mtext: srcBlock.mtext,
          olinks: srcBlock.olinks,
          boosting: srcBlock.boosting,
          acturalSrc: blockParams.src,
          src: blockParams.src,
        } as const;
        return ret;
      } else if (blockParams.type == "virtualBlock") {
        const srcBlock = getBlockRef(blockParams.src).value;
        if (!srcBlock) {
          // XXX maybe move to autoRetryGet?
          console.error(`virtual block ${blockParams.id} 的源块 ${blockParams.src} 不存在`);
          return null;
        }
        const ret: VirtualBlock = {
          type: "virtualBlock",
          id: blockParams.id,
          parentId: blockParams.parentId,
          parentRef: getBlockRef(blockParams.parentId),
          childrenIds: blockParams.childrenIds,
          childrenRefs: blockParams.childrenIds.map((id) => getBlockRef(id)),
          fold: blockParams.fold,
          deleted: false,
          content: srcBlock.content,
          ctext: srcBlock.ctext,
          metadata: srcBlock.metadata,
          mtext: srcBlock.mtext,
          olinks: srcBlock.olinks,
          boosting: srcBlock.boosting,
          acturalSrc: blockParams.src,
          src: blockParams.src,
          childrenCreated: blockParams.childrenCreated,
        } as const;
        return ret;
      }
      throw new Error("Invalid block type");
    };

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

    const registerDataDocObserver = (doc: Y.Doc) => {
      const blockDataMap = doc.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
      blockDataMap.observe((event) => {
        if (event.transaction.origin == "local") return; // 避免无限循环
        const changes = [...event.changes.keys.entries()];

        console.debug("handling observer event of blockDataMap", changes);
        for (const [key, { action, oldValue }] of changes) {
          // 添加或更新一个块的块数据
          if (action == "add" || action == "update") {
            const blockRef = getBlockRef(key);
            const blockData = blockDataMap.get(key);
            if (!blockData) {
              console.error("blockDataMap changed, but blockInfoMap doesn't have the block", key);
              continue;
            }
            // blocks 中有这个块，更新 blocks 中对应块的块数据
            if (blockRef.value != null && blockRef.value.type === "normalBlock") {
              const [content, metadata] = blockData;
              if (content == null) {
                console.error("blockDataMap changed, but normal block doesn't have content", key);
                continue;
              }
              blockRef.value.content = content;
              blockRef.value.metadata = metadata;
            }
            // blocks 中没有这个块，则什么也不做。因为如果需要这个块的数据（比如监听 blockInfoMap 更新 blocks 时），
            // 会自己来 blockDataMap 拿，然后更新 blocks。
          }
          // 删除一个块的块数据，也什么都不做。因为如果是自己删除的，那么应该已经从 blocks 里删除了，
          // 如果不是自己删除的，blockInfoMap 会监听到变化，然后更新 blocks。
        }
      });
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

    const getBlockRef = (blockId: BlockId) => {
      let blockRef = blocks.get(blockId);
      if (!blockRef) {
        blockRef = shallowRef(null) as ShallowRef<Block | null>;
        blocks.set(blockId, blockRef);
      }
      return blockRef;
    };

    const getBlock = (blockId: BlockId, clone: boolean = true) => {
      const blockRef = getBlockRef(blockId);
      if (!blockRef.value) return null;
      const cloned = {
        type: blockRef.value.type,
        loading: false,
        id: blockRef.value.id,
        parentId: blockRef.value.parentId,
        parentRef: blockRef.value.parentRef,
        childrenIds: [...blockRef.value.childrenIds],
        childrenRefs: [...blockRef.value.childrenRefs],
        fold: blockRef.value.fold,
        deleted: blockRef.value.deleted,
        content: JSON.parse(JSON.stringify(blockRef.value.content)),
        ctext: blockRef.value.ctext,
        metadata: JSON.parse(JSON.stringify(blockRef.value.metadata)),
        mtext: blockRef.value.mtext,
        olinks: [...blockRef.value.olinks],
        boosting: blockRef.value.boosting,
        acturalSrc: blockRef.value.acturalSrc,
        ...(blockRef.value.type == "normalBlock" ? { docId: blockRef.value.docId } : {}),
        ...(blockRef.value.type == "mirrorBlock" ? { src: blockRef.value.src } : {}),
        ...(blockRef.value.type == "virtualBlock"
          ? { src: blockRef.value.src, childrenCreated: blockRef.value.childrenCreated }
          : {}),
      };
      return cloned as Block;
    };

    const getBlockIdPath = (blockId: BlockId): Block[] => {
      let curr = getBlockRef(blockId);
      if (!curr) return [];
      const path = [];
      while (curr.value) {
        path.push(curr.value);
        const parentRef = curr.value.parentRef;
        if (parentRef.value) curr = parentRef;
        else curr = getBlockRef(curr.value.parentId);
      }
      return path;
    };

    const forDescendants = ({
      onEachBlock,
      rootBlockId,
      afterLeavingChildrens,
      rootBlockLevel,
      nonFoldOnly,
      includeSelf,
      ignore,
    }: ForDescendantsOptions) => {
      nonFoldOnly ??= true;
      includeSelf ??= true;
      if (rootBlockLevel == null) {
        const path = getBlockIdPath(rootBlockId);
        if (!path) {
          console.error("cannot get path of ", rootBlockId);
          return;
        }
        rootBlockLevel = path.length - 1;
      }

      const dfs = (block: Block, currLevel: number) => {
        const alBlock = { ...block, level: currLevel };
        const ignoreResult = ignore?.(alBlock);
        if (ignoreResult == "ignore-this-and-descendants") return;

        if (includeSelf || block.id != rootBlockId) {
          if (ignoreResult != "ignore-this") {
            onEachBlock(alBlock, ignoreResult);
          }
        }
        // "keep" 可以覆盖 nonFoldOnly 的效果
        if (ignoreResult != "keep")
          if ((nonFoldOnly && block.fold) || ignoreResult == "ignore-descendants") return;
        if (typeof block.childrenIds == "string") return;
        for (const childRef of block.childrenRefs) {
          if (childRef.value && !childRef.value.deleted) dfs(childRef.value, currLevel + 1);
        }
        if (afterLeavingChildrens) {
          afterLeavingChildrens(alBlock);
        }
      };

      const rootBlock = getBlockRef(rootBlockId).value;
      if (!rootBlock) {
        console.error("Cannot find root block", rootBlockId);
        return;
      }
      dfs(rootBlock, rootBlockLevel);
    };

    ///////////////////// Block Transaction /////////////////////

    const _upsertBlock = (blockId: BlockId, block: Block | null, yjsTr: YjsLayerTransaction) => {
      if (!blockInfoMap.value) return;

      ///// 1. 更新 blocks
      const oldBlock = blocks.get(blockId)?.value;
      if (blocks.has(blockId)) {
        blocks.get(blockId)!.value = block;
      } else {
        const blockRef = shallowRef(block) as ShallowRef<Block | null>;
        blocks.set(blockId, blockRef);
      }

      ///// 2. 推送更新到 yjs 层
      if (block) {
        const oldBlockInfo = blockInfoMap.value.get(blockId);
        const newBlockInfo: BlockInfo = [
          calcBlockStatus(block.type, block.fold),
          block.parentId,
          block.childrenIds,
          "docId" in block ? block.docId : null,
          "src" in block ? block.src : null,
        ] as const;
        // 如果旧信息不存在，或者新旧信息不同，则更新
        if (!oldBlockInfo || JSON.stringify(oldBlockInfo) != JSON.stringify(newBlockInfo)) {
          yjsTr.upsertBlockInfo(blockId, newBlockInfo);
        }

        // 如果是 normal block，还需要更新块数据
        if (block.type == "normalBlock") {
          const blockDataDoc = yjsManager.getDataDoc(block.docId, registerDataDocObserver);
          const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
          if (blockDataDoc && blockDataMap) {
            const oldBlockData = blockDataMap.get(blockId);
            const newBlockData: BlockData = [block.content, block.metadata] as const;
            // 如果旧数据不存在，或者新旧数据不同，则更新
            if (!oldBlockData || JSON.stringify(oldBlockData) != JSON.stringify(newBlockData)) {
              yjsTr.upsertBlockData(block.docId, blockId, newBlockData);
            }
          }
        }

        // 如果旧块是普通块，而新块不是普通块，则删除旧块数据
        if (oldBlock?.type == "normalBlock" && block.type != "normalBlock") {
          const blockDataDoc = yjsManager.getDataDoc(oldBlock.docId, registerDataDocObserver);
          const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
          if (blockDataDoc && blockDataMap) {
            yjsTr.deleteBlockData(oldBlock.docId, blockId);
          }
        }
      }

      ///// 3. 更新 mirrors 和 virtuals
      if (block) {
        if (block.type == "mirrorBlock") {
          _addMirror(block.src, block.id);
        } else if (block.type == "virtualBlock") {
          _addVirtual(block.src, block.id);
        }
      }
      if (oldBlock) {
        if (oldBlock.type == "mirrorBlock") {
          _deleteMirror(oldBlock.src, oldBlock.id);
        } else if (oldBlock.type == "virtualBlock") {
          _deleteVirtual(oldBlock.src, oldBlock.id);
        }
      }
    };

    const _deleteBlock = (blockId: BlockId, yjsTr: YjsLayerTransaction) => {
      if (!blockInfoMap.value) return;
      const oldBlock = blocks.get(blockId)?.value;

      if (oldBlock) {
        ///// 1. 更新 blocks
        oldBlock.deleted = true;
        blocks.delete(blockId);

        ///// 2. 推送更新到 yjs 层
        // 从 blockInfoMap 中删除块信息
        yjsTr.deleteBlockInfo(blockId);
        // 如果有关联的块数据，也一并删除
        if (oldBlock.type == "normalBlock") {
          const blockDataDoc = yjsManager.getDataDoc(oldBlock.docId, registerDataDocObserver);
          const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
          if (blockDataMap) {
            yjsTr.deleteBlockData(oldBlock.docId, blockId);
          }
        }

        ///// 3. 更新 mirrors 和 virtuals
        if (oldBlock.type == "mirrorBlock") {
          _deleteMirror(oldBlock.src, oldBlock.id);
        } else if (oldBlock.type == "virtualBlock") {
          _deleteVirtual(oldBlock.src, oldBlock.id);
        }
      }
    };

    const createBlockTransaction = (origin?: any) => {
      const tr: BlockTransaction = {
        origin,
        patches: [],
        reversePatches: [],
        addBlock: <T extends AddBlockParams>(block: T) => {
          tr.patches.push({ op: "add", block });
          tr.reversePatches.push({ op: "delete", blockId: block.id });
          return tr;
        },
        updateBlock: <T extends AddBlockParams>(block: T) => {
          const oldBlock = blocks.get(block.id)?.value;
          if (!oldBlock) {
            throw new Error(`Cannot find old block ${block.id}, maybe you should add it first?`);
          }
          tr.patches.push({ op: "update", block });
          tr.reversePatches.push({
            op: "update",
            block: _toBlockParams(oldBlock),
          });
          return tr;
        },
        deleteBlock: (blockId: BlockId) => {
          const oldBlock = blocks.get(blockId)?.value;
          if (!oldBlock) {
            throw new Error(`Cannot find old block ${blockId}, maybe you should add it first?`);
          }
          tr.patches.push({ op: "delete", blockId });
          tr.reversePatches.push({ op: "add", block: _toBlockParams(oldBlock) });
          return tr;
        },
        commit: () => {
          commitBlockTransaction(tr);
        },
        setOrigin: (origin: any) => {
          tr.origin = origin;
          return tr;
        },
      };
      return tr;
    };

    const commitBlockTransaction = (transaction: BlockTransaction) => {
      const { origin, patches } = transaction;
      console.debug("Committing transaction with origin:", origin, "and patches:", patches);
      
      // 所有对 yjs 层的操作通过 yjs 事务进行
      const yjsTr = yjsManager.createYjsLayerTransaction();
      
      if (!blockInfoMap.value) return;
      for (const patch of patches) {
        const { op } = patch;
        console.debug("Processing patch operation:", op);

        // 1. 新增块
        if (op == "add") {
          const blockParams = patch.block;
          // 如果块已经存在，则跳过
          const oldBlock = blocks.get(blockParams.id);
          if (oldBlock?.value != null) {
            console.error("Block already exists", blockParams.id);
            continue;
          }
          const block = _fromBlockParams(blockParams);
          if (block) _upsertBlock(block.id, block, yjsTr);
        }

        // 2. 更新块
        else if (op == "update") {
          // 找不到更新前的块，跳过
          const oldBlock = blocks.get(patch.block.id)?.value;
          if (!oldBlock) {
            console.error(`尝试更新块，但无法找到旧块 blockId=${patch.block.id}`);
            continue;
          }
          const blockParams = patch.block;
          const block = _fromBlockParams(blockParams);
          if (block) _upsertBlock(block.id, block, yjsTr);
        }

        // 3. 删除块
        else if (op == "delete") {
          const { blockId } = patch;
          _deleteBlock(blockId, yjsTr);
        }
      }

      // 提交 yjs 层事务
      yjsTr.commit();
      console.debug("Transaction commit completed");
    };

    const getCtext = (content: BlockContent, includeTags?: boolean) => {  
      if (content[0] === BLOCK_CONTENT_TYPES.TEXT) {
        const doc = Node.fromJSON(pmSchema, content[1]);
        const arr: string[] = [];
        doc.descendants((node) => {
          // 跳过标签
          if (!includeTags && node.type.name == "blockRef_v2" && node.attrs.tag) return;
          arr.push(node.textContent);
        });
        return arr.join("");
      } else if (content[0] == BLOCK_CONTENT_TYPES.CODE) {
        return `${content[1]} (${content[2]})`;
      } else if (content[0] == BLOCK_CONTENT_TYPES.MATH) {
        return content[1];
      } else {
        console.warn("unsupported block content type");
        return "";
      }
    };

    const getMtext = (metadata: any) => {
      const isUuid = (str: string) => {
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(str);
      };
      const result = [];
      const internalProps = ["specs", "status", "no", "ncols", "paragraph"];
      for (const [key, value] of Object.entries(metadata ?? {})) {
        if (internalProps.includes(key)) continue;
        result.push(key);
        result.push(": ");
        // value 可能是：
        // 1. 普通字符串
        // 2. 普通字符串数组
        // 3. 块 ID
        // 4. 块 ID 数组
        let normalizedValue;
        if (typeof value == "string") {
          normalizedValue = [value];
        } else if (Array.isArray(value)) {
          normalizedValue = value;
        } else {
          continue; // unexpected value
        }
        for (const s of normalizedValue) {
          if (isUuid(s)) {
            // get block content
            const block = getBlock(s);
            if (!block) continue;
            const s2 = getCtext(block.content);
            result.push(s2);
          } else {
            result.push(s);
          }
          result.push(", ");
        }
        result.pop(); // pop last comma
        result.push("; ");
      }
      result.pop(); // pop last ;
      return result.join("");
    };

    watch(
      blockInfoMap,
      () => {
        console.debug("blockInfoMap changed, reregister observers");

        const promises: Promise<void>[] = []; // 用于等待所有异步任务完成后，一起提交块事务

        blockInfoMap.value?.observe((event) => {
          if (!blockInfoMap.value) return;
          console.log("origin", event.transaction.origin, baseDoc.value?.clientID);
          
          if (event.transaction.origin == baseDoc.value?.clientID) return; // 不处理自己发出的更新
          const changes = [...event.changes.keys.entries()];

          // 所有更新都通过块事务进行
          const tr = createBlockTransaction();
          tr.setOrigin(event.transaction.origin);

          console.debug("handling observer event of blockInfoMap", changes);
          if (!blockInfoMap.value) return;
          for (const [key, { action, oldValue }] of changes) {
            // 一个块被删除了
            if (action == "delete") {
              console.debug("Processing delete action for block:", key);
              const block = blocks.get(key);
              if (block) {
                console.debug("Deleting block from loadedBlocks:", key);
                tr.deleteBlock(key);
              }
            }

            // 一个块被添加或更新了
            else if (action == "add" || action == "update") {
              console.debug("Processing add or update action for block:", key);
              const blockInfo = blockInfoMap.value.get(key)!;
              const [status, parentId, childrenIds, docId, src] = blockInfo;
              const { type, fold } = extractBlockStatus(status);

              // 添加或更新的块是普通块
              if (type == "normalBlock") {
                if (docId == null) {
                  console.error("Doc id is null, this should not happen", key);
                  continue;
                }

                // 尝试获取块数据
                const promise = (async () => {
                  const [promise, canceller] = autoRetryGet<BlockData>(
                    (onSuccess) => {
                      // 先从 blocks 中获取
                      // 注意：blockDataDoc 更新时会推送新数据到 blocks，因此这样做是没有问题的
                      const block = getBlock(key);
                      if (block != null && block.type == "normalBlock") {
                        onSuccess([block.content, block.metadata]);
                        return;
                      }
                      // 如果 blocks 中没有，再从 blockDataDoc 中获取
                      const dataDoc = yjsManager.getDataDoc(docId, registerDataDocObserver);
                      const blockDataMap = dataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                      const blockData = blockDataMap?.get(key);
                      blockData && onSuccess(blockData);
                    },
                    { mode: "backoff", base: 100, max: 2000 },
                    50,
                    true,
                  );

                  // 将这一自旋任务记录到 retryTasks
                  retryTasks.getBlockData.set(key, [promise, canceller]);

                  // 数据加载后，更新 loadedBlocks
                  const blockData = await promise;
                  const [blockContent, blockMetadata] = blockData!;
                  if (blockContent == null) {
                    console.error("Normal Block content is null", key);
                    return;
                  }
                  tr.addBlock({
                    type: "normalBlock",
                    id: key,
                    parentId,
                    childrenIds,
                    fold,
                    content: blockContent,
                    metadata: blockMetadata,
                    docId,
                  });
                })();

                promises.push(promise);
              }

              // 这个块是镜像块或虚拟块
              else {
                if (!src) {
                  console.error("Cannot find src for block", key);
                  continue;
                }

                // 尝试获取来源块的块信息
                const promise = (async () => {
                  const [promise, canceller] = autoRetryGet<BlockInfo>(
                    (onSuccess) => {
                      const blockInfo = blockInfoMap.value?.get(src);
                      blockInfo && onSuccess(blockInfo);
                    },
                    { mode: "backoff", base: 100, max: 2000 },
                    50,
                    true,
                  );

                  // 将这一自旋任务记录到 retryTasks
                  retryTasks.getBlockInfo.set(key, [promise, canceller]);

                  const blockInfo = await promise;
                  const [srcStatus, srcParentId, srcChildrenIds, srcDocId] = blockInfo!;
                  const { type: srcType, fold: srcFold } = extractBlockStatus(srcStatus);

                  if (srcType == "normalBlock") {
                    if (srcDocId == null) {
                      console.error("Src doc id is null, this should not happen", key);
                      return;
                    }

                    // 尝试获取来源块的数据
                    const [promise, canceller] = autoRetryGet<BlockData>(
                      (onSuccess) => {
                        // 先从 blocks 中获取
                        // 注意：blockDataDoc 更新时会推送新数据到 blocks，因此这样做是没有问题的
                        const block = getBlock(src);
                        if (block != null && block.type == "normalBlock") {
                          onSuccess([block.content, block.metadata]);
                          return;
                        }
                        // 如果 blocks 中没有，再从 blockDataDoc 中获取
                        const dataDoc = yjsManager.getDataDoc(srcDocId!, registerDataDocObserver);
                        const blockDataMap = dataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                        const blockData = blockDataMap?.get(src);
                        blockData && onSuccess(blockData);
                      },
                      { mode: "backoff", base: 100, max: 2000 },
                      50,
                      true,
                    );

                    // 将这一自旋任务记录到 retryTasks
                    retryTasks.getBlockData.set(key, [promise, canceller]);

                    // 数据加载后，更新 loadedBlocks
                    const srcBlockData = await promise!;
                    const [srcBlockContent, srcBlockMetadata] = srcBlockData;
                    if (srcBlockContent == null) {
                      console.error("Mirror / Virtual Block's src block content is null", key);
                      return;
                    }
                    tr.addBlock({
                      type: type,
                      id: key,
                      parentId,
                      childrenIds,
                      fold,
                      src,
                      // 如果来源块的子块数量和当前块的子块数量相同，则说明当前块的子块已经创建完毕
                      ...(type === "virtualBlock" ? { childrenCreated: srcChildrenIds.length == childrenIds.length } : {}),
                    } as AddBlockParams);
                  } else {
                    console.error("Src type must be normalBlock, but got", srcType);
                    return;
                  }
                })();

                promises.push(promise);
              }
            }
          }

          // 等待所有异步任务完成后，提交块事务
          Promise.all(promises).then(() => {
            tr.setOrigin(event.transaction.origin);
            tr.commit();
            eventBus.emit("afterBlocksTrCommit", tr);
          });
        });
      },
      { immediate: true },
    );

    // helper functions for creating and executing block transaction
    const addBlock = (block: AddBlockParams) => {
      return createBlockTransaction().addBlock(block).commit();
    };

    const updateBlock = (block: AddBlockParams) => {
      return createBlockTransaction().updateBlock(block).commit();
    };

    const deleteBlock = (blockId: BlockId) => {
      return createBlockTransaction().deleteBlock(blockId).commit();
    };

    // 如果根块不存在，则创建之，并附带创建一个孩子
    const ensureTree = async () => {
      const baseDoc = yjsManager.baseDoc.value;
      if (!baseDoc) return;
      // 等待文档同步
      await yjsManager.whenSynced(baseDoc.guid);
      const blockInfoMap = yjsManager.blockInfoMap.value!;
      for (const [_, blockId] of blockInfoMap.values()) {
        if (blockId === "root") return;
      }
      // 根块不存在，创建之
      const fstChildId = nanoid();
      createBlockTransaction()
        .addBlock({
          type: "normalBlock",
          id: fstChildId,
          fold: false,
          parentId: "root",
          childrenIds: [],
          content: textContentFromString(""),
          metadata: {},
        })
        .addBlock({
          type: "normalBlock",
          id: "root",
          fold: false,
          parentId: "root",
          childrenIds: [fstChildId],
          content: textContentFromString(""),
          metadata: {},
        })
        .commit();
    };

    const getRootBlockRef = () => getBlockRef("root");

    return {
      loadedBlocks: blocks,
      getBlock,
      getBlockRef,
      getRootBlockRef,
      getBlockIdPath,
      getMirrors,
      getVirtuals,
      getOccurs,
      ensureTree,
      forDescendants,
      createBlockTransaction,
      addBlock,
      updateBlock,
      deleteBlock,
    };
  },
);
