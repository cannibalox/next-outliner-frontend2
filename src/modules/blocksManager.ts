import {
  type ABlock,
  type BlockId,
  type LoadingBlock,
  type LoadedMirrorBlock,
  type LoadedNormalBlock,
  type LoadedVirtualBlock,
  type LoadingNormalBlock,
  type LoadingMirrorBlock,
  type LoadingVirtualBlock,
  type LoadedBlock,
  type BlockContent,
  type LoadedBlockWithLevel,
} from "@/common/types";
import { ref, type Ref, shallowReactive, type UnwrapRef, watch } from "vue";
import type { BlockData, BlockInfo } from "./types";
import { calcBlockStatus, extractBlockStatus } from "@/common/block";
import { defineModule } from "../common/module";
import { yjsManager } from "./YjsManager";
import * as Y from "yjs";
import { settings } from "./settings";
import { taskQueue } from "./taskQueue";
import { nanoid } from "nanoid";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { eventBus } from "./eventBus";
import { textContentFromString } from "@/utils/pm";
import { autoRetryGet } from "@/utils/auto-retry";

export type AddOrUpdateBlockParams = {
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
  | { op: "add"; block: AddOrUpdateBlockParams }
  | { op: "update"; block: AddOrUpdateBlockParams }
  | { op: "delete"; blockId: BlockId; docId?: number };

export type BlockTransaction = {
  origin: any;
  patches: BlockPatch[];
  reversePatches: BlockPatch[];
  checker: () => boolean;
  addBlock: (block: AddOrUpdateBlockParams) => BlockTransaction;
  updateBlock: (block: AddOrUpdateBlockParams) => BlockTransaction;
  deleteBlock: (blockId: BlockId) => BlockTransaction;
  addChecker: (checker?: () => boolean) => BlockTransaction;
  commit: () => void;
};

export type ForDescendantsOptions = {
  onEachBlock: (
    block: LoadedBlockWithLevel,
    ignore?: "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants",
  ) => void | Promise<void>;
  rootBlockId: BlockId;
  afterLeavingChildrens?: (block: LoadedBlock) => void | Promise<void>;
  rootBlockLevel?: number;
  nonFoldOnly?: boolean;
  includeSelf?: boolean;
  ignore?: (
    block: LoadedBlockWithLevel,
  ) => "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants";
};

const BLOCK_DATA_MAP_NAME = "blockData";

const _toAddOrUpdateBlockParams = (block: LoadedBlock): AddOrUpdateBlockParams => {
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

export const blocksManager = defineModule(
  "blocksManager",
  { yjsManager, settings, taskQueue, eventBus },
  ({ yjsManager, settings, taskQueue, eventBus }) => {
    const { baseDoc, blockInfoMap } = yjsManager;

    const loadedBlocks = new Map<BlockId, Ref<LoadedBlock | null>>();
    // 记录所有自旋任务，因为可能需要手工取消
    // 比如对于一个自旋获取块数据的任务，如果监听到块加载事件，就可以取消它了
    // 至于为什么不只监听块加载事件，就当作是没事干吧
    const retryTasks = {
      getBlockInfo: new Map<BlockId, [Promise<BlockInfo>, () => void]>(), // 所有自旋获取块信息的任务
      getBlockData: new Map<BlockId, [Promise<BlockData>, () => void]>(), // 所有自旋获取块数据的任务
    };
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

    const _setLoadedBlock = (blockId: BlockId, block: LoadedBlock | null) => {
      const oldBlock = loadedBlocks.get(blockId)?.value;
      eventBus.emit("blocksChanged");
      if (loadedBlocks.has(blockId)) {
        loadedBlocks.get(blockId)!.value = block;
      } else {
        const blockRef = ref(block) as Ref<LoadedBlock | null>;
        loadedBlocks.set(blockId, blockRef);
      }

      // 更新 mirrors 和 virtuals
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

    const _deleteLoadedBlock = (blockId: BlockId) => {
      const oldBlock = loadedBlocks.get(blockId)?.value;

      if (oldBlock) {
        eventBus.emit("blocksChanged");
        oldBlock.deleted = true;
        loadedBlocks.delete(blockId);

        // 更新 mirrors 和 virtuals
        if (oldBlock.type == "mirrorBlock") {
          _deleteMirror(oldBlock.src, oldBlock.id);
        } else if (oldBlock.type == "virtualBlock") {
          _deleteVirtual(oldBlock.src, oldBlock.id);
        }
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

    const getBlockRef = (blockId: BlockId) => {
      let blockRef = loadedBlocks.get(blockId);
      if (!blockRef) {
        blockRef = ref(null) as Ref<LoadedBlock | null>;
        loadedBlocks.set(blockId, blockRef);
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
      return cloned as LoadedBlock;
    };

    const getBlockIdPath = (blockId: BlockId): LoadedBlock[] => {
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

      const dfs = (block: LoadedBlock, currLevel: number) => {
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

    const createBlockTransaction = (origin?: any) => {
      const tr: BlockTransaction = {
        origin,
        patches: [],
        reversePatches: [],
        checker: () => true,
        addBlock: (block: AddOrUpdateBlockParams) => {
          tr.patches.push({ op: "add", block });
          tr.reversePatches.push({ op: "delete", blockId: block.id });
          return tr;
        },
        updateBlock: (block: AddOrUpdateBlockParams) => {
          const oldBlock = loadedBlocks.get(block.id)?.value;
          if (!oldBlock) {
            throw new Error(`Cannot find old block ${block.id}, maybe you should add it first?`);
          }
          tr.patches.push({ op: "update", block });
          tr.reversePatches.push({
            op: "update",
            block: _toAddOrUpdateBlockParams(oldBlock),
          });
          return tr;
        },
        deleteBlock: (blockId: BlockId) => {
          const oldBlock = loadedBlocks.get(blockId)?.value;
          if (!oldBlock) {
            throw new Error(`Cannot find old block ${blockId}, maybe you should add it first?`);
          }
          tr.patches.push({ op: "delete", blockId });
          tr.reversePatches.push({ op: "add", block: _toAddOrUpdateBlockParams(oldBlock) });
          return tr;
        },
        addChecker: (checker?: () => boolean) => {
          if (!checker) return tr;
          const oldChecker = tr.checker;
          tr.checker = () => oldChecker() && checker();
          return tr;
        },
        commit: () => {
          commitBlockTransaction(tr);
        },
      };
      return tr;
    };

    const commitBlockTransaction = (transaction: BlockTransaction) => {
      taskQueue.addTask(
        () => {
          if (!blockInfoMap.value) return;

          const { origin, patches } = transaction;
          console.debug("Committing transaction with origin:", origin, "and patches:", patches);
          for (const patch of patches) {
            const { op } = patch;
            console.debug("Processing patch operation:", op);

            // 1. 新增块
            if (op == "add") {
              const block = patch.block;
              if (blockInfoMap.value.has(block.id)) {
                console.error("Block already exists", block.id);
                continue;
              }
              const targetDocId = 0; // TODO
              blockInfoMap.value.set(block.id, [
                calcBlockStatus(block.type, block.fold),
                block.parentId,
                block.childrenIds,
                targetDocId,
                "src" in block ? block.src : null,
              ]);
              console.debug("Added block to blockInfoMap:", block);
              if (block.type == "normalBlock") {
                const blockDataDoc = yjsManager.loadDataDoc(targetDocId);
                const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                if (blockDataMap) {
                  blockDataMap.set(block.id, [block.content, block.metadata]);
                  console.debug("Updated blockDataMap for block:", block.id);
                }
              }
            }

            // 2. 更新块
            else if (op == "update") {
              const oldBlock = loadedBlocks.get(patch.block.id)?.value;
              if (!oldBlock) {
                console.error(`尝试更新块，但无法找到旧块 blockId=${patch.block.id}`);
                continue;
              }
              const block = patch.block;

              // 更新 blockInfoMap
              blockInfoMap.value.set(block.id, [
                calcBlockStatus(block.type, block.fold),
                block.parentId,
                block.childrenIds,
                "docId" in oldBlock ? oldBlock.docId : null,
                "src" in block ? block.src : null,
              ]);
              console.debug(`更新 blockInfoMap`);

              // 更新 blockDataMap
              if (block.type == "normalBlock" && oldBlock.type == "normalBlock") {
                const blockDataDoc = yjsManager.loadDataDoc(oldBlock.docId);
                const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                if (blockDataMap) {
                  blockDataMap.set(block.id, [block.content, block.metadata]);
                  console.debug("Updated blockDataMap for block:", block.id);
                }
              }

              // TODO 其他情况
              // 如果块类型改变 (normalBlock -> mirrorBlock / virtualBlock)，清除块数据
              if (oldBlock.type == "normalBlock" && block.type != "normalBlock") {
                const blockDataDoc = yjsManager.loadDataDoc(oldBlock.docId);
                const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                if (blockDataMap) {
                  blockDataMap.delete(oldBlock.id);
                  console.debug("Deleted block data for changed block type:", oldBlock.id);
                }
              }
            }

            // 3. 删除块
            else if (op == "delete") {
              const { blockId, docId } = patch;
              blockInfoMap.value.delete(blockId);
              console.debug("Deleted block from blockInfoMap:", blockId);
              if (docId) {
                const blockDataDoc = yjsManager.loadDataDoc(docId);
                const blockDataMap = blockDataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                if (blockDataMap) {
                  blockDataMap.delete(blockId);
                  console.debug("Deleted block data for block:", blockId);
                }
              }
            }
          }
          console.debug("Transaction commit completed");
        },
        { checker: transaction.checker },
      );
    };

    watch(
      blockInfoMap,
      () => {
        console.debug("blockInfoMap changed, reregister observers");
        // 根据 blockInfoMap 的变化更新 loadedBlocks
        // 当检测到一个块被添加，但其数据尚未准备好时，创建一个待处理任务
        // 当检测到一个块被删除时，从 loadedBlocks 中删除它，并将其标记为已删除
        console.debug("Registering observer for blockInfoMap in baseDoc", baseDoc.value?.guid);

        blockInfoMap.value?.observe((event) => {
          // 先计算出 changes，因为事件触发完只后就算不了了
          if (!blockInfoMap.value) return;
          if (event.transaction.origin == "local") return; // 避免无限循环
          const changes = [...event.changes.keys.entries()];

          taskQueue.addTask(() => {
            console.debug("handling observer event of blockInfoMap", changes);
            if (!blockInfoMap.value) return;
            for (const [key, { action, oldValue }] of changes) {
              // 一个块被删除了
              if (action == "delete") {
                console.debug("Processing delete action for block:", key);
                const block = loadedBlocks.get(key);
                if (block) {
                  console.debug("Deleting block from loadedBlocks:", key);
                  _deleteLoadedBlock(key);
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
                  (async () => {
                    const [promise, canceller] = autoRetryGet<BlockData>(
                      (onSuccess) => {
                        const dataDoc = yjsManager.loadDataDoc(docId);
                        const blockDataMap = dataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                        const blockData = blockDataMap?.get(key);
                        blockData && onSuccess(blockData);
                      },
                      { mode: "backoff", base: 100, max: 2000 },
                      10,
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
                    _setLoadedBlock(key, {
                      type: "normalBlock",
                      loading: false,
                      id: key,
                      deleted: false,
                      parentId,
                      parentRef: getBlockRef(parentId),
                      childrenIds,
                      childrenRefs: childrenIds.map((id) => getBlockRef(id)),
                      fold,
                      content: blockContent,
                      ctext: "",
                      metadata: blockMetadata,
                      mtext: "",
                      olinks: [],
                      boosting: 0,
                      acturalSrc: key,
                      docId,
                    } as LoadedNormalBlock);
                  })();
                }

                // 这个块是镜像块或虚拟块
                else {
                  if (!src) {
                    console.error("Cannot find src for block", key);
                    continue;
                  }

                  // 尝试获取来源块的块信息
                  (async () => {
                    const [promise, canceller] = autoRetryGet<BlockInfo>(
                      (onSuccess) => {
                        const blockInfo = blockInfoMap.value?.get(src);
                        blockInfo && onSuccess(blockInfo);
                      },
                      { mode: "backoff", base: 100, max: 2000 },
                      10,
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
                          const dataDoc = yjsManager.loadDataDoc(srcDocId!);
                          const blockDataMap = dataDoc?.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
                          const blockData = blockDataMap?.get(src);
                          blockData && onSuccess(blockData);
                        },
                        { mode: "backoff", base: 100, max: 2000 },
                        10,
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
                        const block: LoadedMirrorBlock | LoadedVirtualBlock = {
                          type: type as "mirrorBlock" | "virtualBlock",
                          loading: false,
                          id: key,
                          deleted: false,
                          parentId,
                          parentRef: getBlockRef(parentId),
                          childrenIds,
                          childrenRefs: childrenIds.map((id) => getBlockRef(id)),
                          fold,
                          content: srcBlockContent,
                          ctext: "",
                          metadata: srcBlockMetadata,
                          mtext: "",
                          olinks: [],
                          boosting: 0,
                          src,
                          acturalSrc: src,
                          // 如果来源块的子块数量和当前块的子块数量相同，则说明当前块的子块已经创建完毕
                          childrenCreated: srcChildrenIds.length == childrenIds.length,
                        };
                        _setLoadedBlock(key, block);
                    } else {
                      console.error("Src type must be normalBlock, but got", srcType);
                      return;
                    }
                  })();
                }
              }
            }
          });
        });
      },
      { immediate: true },
    );

    // helper functions for creating and executing block transaction
    const addBlock = (block: AddOrUpdateBlockParams, checker?: () => boolean) => {
      return createBlockTransaction().addChecker(checker).addBlock(block).commit();
    };

    const updateBlock = (block: AddOrUpdateBlockParams, checker?: () => boolean) => {
      return createBlockTransaction().addChecker(checker).updateBlock(block).commit();
    };

    const deleteBlock = (blockId: BlockId, checker?: () => boolean) => {
      return createBlockTransaction().addChecker(checker).deleteBlock(blockId).commit();
    };

    // 如果根块不存在，则创建之，并附带创建一个孩子
    const ensureTree = async () => {
      const baseDoc = yjsManager.baseDoc.value;
      if (!baseDoc) return;
      // 等待文档同步
      await yjsManager.whenSynced(baseDoc.guid);
      const blockInfoMap = yjsManager.blockInfoMap.value!;
      for (const [_, blockId] of blockInfoMap.values()) {
        if (blockId == "root") return;
      }
      // 根块不存在，创建之
      addBlock({
        type: "normalBlock",
        id: "root",
        fold: false,
        parentId: "root",
        childrenIds: [],
        content: textContentFromString(""),
        metadata: {},
      });
    }

    const getRootBlockRef = () => getBlockRef("root");

    return {
      loadedBlocks,
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
