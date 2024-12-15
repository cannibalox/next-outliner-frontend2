import { calcBlockStatus, extractBlockStatus } from "@/common/block";
import { type BlockContent, type BlockId, type BlockData, type BlockInfo } from "@/common/types";
import { autoRetryGet } from "@/utils/auto-retry";
import { textContentFromString } from "@/utils/pm";
import { nanoid } from "nanoid";
import { ref, type Ref, shallowReactive, type ShallowRef, shallowRef, toRaw, watch } from "vue";
import * as Y from "yjs";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import type { YjsLayer, YjsLayerTransaction } from "../sync-layer/yjsLayer";
import { useEventBus } from "@/plugins/eventbus";
import { EditorView as PmEditorView } from "prosemirror-view";
import { EditorView as CmEditorView } from "@codemirror/view";
import { Selection } from "prosemirror-state";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { z } from "zod";
import useBlockTransaction from "./blockTransaction";
import createUndoManager from "./undoManager";
import { IndexeddbPersistence } from "../sync-layer/indexeddbPersistence";

// 记录事务的来源
// changeSources 是触发改变的来源，用于跳过某些 UI 更新
// 比如一个块内容改变会导致所有其他 occur block 的内容跟着改变
// 更新 UI 时，这个块时改变的源头，因此是不需要更新的
export const BlockOriginSchema = z
  .any()
  .transform((origin) => {
    // IndexeddbPersistence 会自动将 origin 设置为 IndexeddbPersistence 实例，这里需要转换为 local
    if (origin instanceof IndexeddbPersistence) return { type: "local" };
    return origin;
  })
  .pipe(
    z.union([
      z.object({ type: z.literal("ui"), changeSources: z.array(z.string()).optional() }),
      z.object({ type: z.literal("local") }),
      z.object({ type: z.literal("remote") }),
    ]),
  );
export type BlockOrigin = z.infer<typeof BlockOriginSchema>;

export type Block = {
  id: BlockId;
  parentId: BlockId;
  parentRef: ShallowRef<Block | null>;
  childrenIds: BlockId[];
  childrenRefs: ShallowRef<Block | null>[];
  fold: boolean;
  deleted: boolean;
  content: BlockContent;
  ctext: string;
  metadata: Record<string, any>; // TODO
  mtext: string;
  olinks: BlockId[];
  boosting: number;
  acturalSrc: BlockId;
  // 用于记录这个块的来源
  origin: BlockOrigin;
} & (
  | { type: "normalBlock"; docId: number }
  | {
      type: "mirrorBlock";
      src: BlockId;
    }
  | {
      type: "virtualBlock";
      src: BlockId;
      // 虚拟块的子块默认是不会创建的
      // 只有当虚拟块被展开时，才会创建子块
      // 这样做能够避免自引用导致无限递归，也能提高性能
      // 这个标志位用于判断虚拟块的子块是否已经创建
      childrenCreated: boolean;
    }
);

export type NormalBlock = Block & { type: "normalBlock" };
export type MirrorBlock = Block & { type: "mirrorBlock" };
export type VirtualBlock = Block & { type: "virtualBlock" };

// 记录事务开始或结束时的一些状态
// 用于撤销 & 重做
export type TransactionEnvInfo = {
  rootBlockId: BlockId;
  focusedBlockId: BlockId | null;
  selection: any;
  [key: string]: any;
};

export type AddBlockParams = {
  id: BlockId;
  fold: boolean;
  parentId: BlockId;
  childrenIds: BlockId[];
  [key: string]: any; // XXX
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
  origin: BlockOrigin;
  patches: BlockPatch[];
  reversePatches: BlockPatch[];
  meta: {
    // 这个事务是否是撤销或重做事务
    isUndoRedo: boolean;
    // 这个事务是否需要自动添加撤销点
    autoAddUndoPoint: boolean;
    // 这个事务是否可以撤销
    canUndo: boolean;
    [key: string]: any;
  };
  addBlock: <T extends AddBlockParams>(block: T) => BlockTransaction;
  updateBlock: <T extends AddBlockParams>(block: T) => BlockTransaction;
  deleteBlock: (blockId: BlockId) => BlockTransaction;
  commit: () => void;
  setMeta: (key: string, value: any) => BlockTransaction;
  addTransaction: (tr: BlockTransaction) => BlockTransaction;
  addReverseTransaction: (tr: BlockTransaction) => BlockTransaction;
};

export type ForDescendantsOptions = {
  onEachBlock: (
    block: Block,
    level: number,
    ignore?: "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants",
  ) => void | Promise<void>;
  rootBlockId: BlockId;
  afterLeavingChildrens?: (block: Block, level: number) => void | Promise<void>;
  rootBlockLevel?: number;
  nonFoldOnly?: boolean;
  includeSelf?: boolean;
  ignore?: (
    block: Block,
    level: number,
  ) => "keep" | "ignore-this" | "ignore-descendants" | "ignore-this-and-descendants";
};

export const BLOCK_DATA_MAP_NAME = "blockData";

// 负责从  yjs 层 pull 最新的数据，并在本地更新时，将数据推送到 yjs 层
//
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
export const createBlocksManager = (yjsLayer: YjsLayer) => {
  const { blockInfoMap } = yjsLayer;
  const eventBus = useEventBus();

  const blocks = new Map<BlockId, ShallowRef<Block | null>>();
  // 记录所有自旋任务，因为可能需要手工取消
  // 比如对于一个自旋获取块数据的任务，如果监听到块加载事件，就可以取消它了
  // 至于为什么不只监听块加载事件，就当作是没事干吧
  const retryTasks = {
    getBlockInfo: new Map<BlockId, [Promise<BlockInfo>, () => void]>(), // 所有自旋获取块信息的任务
    getBlockData: new Map<BlockId, [Promise<BlockData>, () => void]>(), // 所有自旋获取块数据的任务
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
      origin: blockRef.value.origin,
    };
    return cloned as Block;
  };

  const getSrcBlock = (blockId: BlockId) => {
    const block = getBlock(blockId);
    if (!block) return null;
    if (block.parentId == "null") return null;
    const srcBlock = getBlock(block.acturalSrc);
    if (!srcBlock) return null;
    return srcBlock as Block & { type: "normalBlock" };
  };

  const getBlockPath = (blockId: BlockId): Block[] => {
    let curr = getBlockRef(blockId);
    if (!curr) return [];
    const path = [];
    while (curr.value) {
      path.push(curr.value);
      if (curr.value.id == "root") break;
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
      const path = getBlockPath(rootBlockId);
      if (!path) {
        console.error("cannot get path of ", rootBlockId);
        return;
      }
      rootBlockLevel = path.length - 1;
    }

    const dfs = (block: Block, currLevel: number) => {
      const ignoreResult = ignore?.(block, currLevel);
      if (ignoreResult == "ignore-this-and-descendants") return;

      if (includeSelf || block.id != rootBlockId) {
        if (ignoreResult != "ignore-this") {
          onEachBlock(block, currLevel, ignoreResult);
        }
      }
      // "keep" 可以覆盖 nonFoldOnly 的效果
      if (ignoreResult != "keep")
        if ((nonFoldOnly && block.fold) || ignoreResult == "ignore-descendants") return;
      if (typeof block.childrenIds == "string") return;
      for (const childRef of block.childrenRefs) {
        if (childRef.value && !childRef.value.deleted) {
          const rawBlock = toRaw(childRef.value);
          dfs(rawBlock, currLevel + 1);
        }
      }
      if (afterLeavingChildrens) {
        afterLeavingChildrens(block, currLevel);
      }
    };

    const rootBlock = getBlock(rootBlockId);
    if (!rootBlock) {
      console.error("Cannot find root block", rootBlockId);
      return;
    }
    dfs(rootBlock, rootBlockLevel);
  };

  // 将块内容转换为字符串，用于显示和搜索
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

  // 将块元数据转换为字符串，用于显示和搜索
  const getMtext = (metadata: any) => {
    const isUuid = (str: string) => {
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return uuidRegex.test(str);
    };
    const result = [];
    // TODO
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

  const getOlinks = (docContent: any) => {
    const doc = Node.fromJSON(pmSchema, docContent);
    const olinks: BlockId[] = [];
    // 从 content 中提取
    doc.descendants((node) => {
      if (node.isAtom && node.type.name == "blockRef_v2") {
        olinks.push(node.attrs.toBlockId);
      }
    });
    return olinks;
  };

  const dataDocLoadHandler = ([_, doc]: [number, Y.Doc]) => {
    const blockDataMap = doc.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
    blockDataMap.observe((event) => {
      const res = BlockOriginSchema.safeParse(event.transaction.origin);
      if (!res.success) {
        console.error("invalid origin", event.transaction.origin);
        return;
      }
      const origin = res.data;

      if (origin.type == "ui") return; // 不处理本地事务，防止无限循环
      const changes = [...event.changes.keys.entries()];
      console.log(`observe ${changes.length} changes on blockDataMap`);
      const tr = createBlockTransaction(origin);

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
            tr.updateBlock({
              ...blockRef.value,
              content,
              metadata,
            });
          }
          // blocks 中没有这个块，则什么也不做。因为如果需要这个块的数据（比如监听 blockInfoMap 更新 blocks 时），
          // 会自己来 blockDataMap 拿，然后更新 blocks。
        }
        // 删除一个块的块数据，也什么都不做。因为如果是自己删除的，那么应该已经从 blocks 里删除了，
        // 如果不是自己删除的，blockInfoMap 会监听到变化，然后更新 blocks。
      }

      tr.commit();
    });
  };
  yjsLayer.on("blockDataLoaded", dataDocLoadHandler);

  watch(
    blockInfoMap,
    () => {
      console.debug("blockInfoMap changed, reregister observers");

      const promises: Promise<void>[] = []; // 用于等待所有异步任务完成后，一起提交块事务

      blockInfoMap.value?.observe((event) => {
        if (!blockInfoMap.value) return;

        const res = BlockOriginSchema.safeParse(event.transaction.origin);
        if (!res.success) {
          console.error("invalid origin", event.transaction.origin);
          return;
        }
        const origin = res.data;

        if (origin.type == "ui") return; // 不处理自己发出的更新
        const tr = createBlockTransaction(origin); // 所有更新都通过块事务进行
        const changes = [...event.changes.keys.entries()];

        console.log(`observe ${changes.length} changes on blockInfoMap`);

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
            const blockInfo = blockInfoMap.value.get(key)!;
            const [status, parentId, childrenIds, docId, src] = blockInfo;
            const { type, fold } = extractBlockStatus(status);

            // 添加或更新的块是普通块
            if (type == "normalBlock") {
              if (docId == null) {
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
                    const dataDoc = yjsLayer.getDataDoc(docId);
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
                      const dataDoc = yjsLayer.getDataDoc(srcDocId!);
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
                    ...(type === "virtualBlock"
                      ? { childrenCreated: srcChildrenIds.length == childrenIds.length }
                      : {}),
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
          tr.commit();
        });
      });
    },
    { immediate: true },
  );

  const hasRootBlock = () => getBlockRef("root").value != null;

  const ensureTree = async (
    onNoRoot: () => void, // 当检测到没有根块时的回调
    onRootFound: () => void, // 当检测到根块时的回调
  ) => {
    const baseDoc = yjsLayer.baseDoc.value;
    if (!baseDoc) return;

    // 等待文档同步
    await yjsLayer.whenSynced(baseDoc.guid);

    // 如果已经有根块，直接返回
    if (hasRootBlock()) {
      onRootFound();
      return;
    }

    // 通知调用者没有找到根块
    onNoRoot();

    // 启动定期检查
    const checkInterval = setInterval(() => {
      if (hasRootBlock()) {
        clearInterval(checkInterval);
        onRootFound();
      }
    }, 1000); // 每秒检查一次

    // 30秒后停止检查
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);
  };

  // 创建新树的具体实现
  const createNewTree = async () => {
    const fstChildId = nanoid();
    createBlockTransaction({ type: "ui" })
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

  const destroy = () => {
    blocks.clear();
    retryTasks.getBlockInfo.clear();
    retryTasks.getBlockData.clear();
    eventBus.emit("blocksDestroy");
  };

  const { createBlockTransaction, addBlock, updateBlock, deleteBlock } = useBlockTransaction({
    blocks,
    yjsLayer,
    getBlockRef,
    getCtext,
    getMtext,
    getOlinks,
  });

  const { undo, redo, addUndoPoint, clearUndoRedoHistory } = createUndoManager({
    createBlockTransaction,
  });

  return {
    loadedBlocks: blocks,
    getBlock,
    getBlockRef,
    getRootBlockRef,
    getBlockPath,
    ensureTree,
    forDescendants,
    createBlockTransaction,
    addBlock,
    updateBlock,
    deleteBlock,
    destroy,
    undo,
    redo,
    getCtext,
    getMtext,
    getOlinks,
    getSrcBlock,
    createNewTree,
    addUndoPoint,
    clearUndoRedoHistory,
  };
};

export type BlocksManager = ReturnType<typeof createBlocksManager>;
