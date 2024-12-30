import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { extractBlockStatus } from "@/common/helper-functions/block";
import { type BlockContent } from "@/common/type-and-schemas/block/block-content";
import { type BlockData } from "@/common/type-and-schemas/block/block-data";
import { type BlockId } from "@/common/type-and-schemas/block/block-id";
import { type BlockInfo } from "@/common/type-and-schemas/block/block-info";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { useEventBus } from "@/plugins/eventbus";
import { plainTextToTextContent } from "@/utils/pm";
import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { Node } from "prosemirror-model";
import { type ShallowRef, shallowRef, toRaw } from "vue";
import { z } from "zod";
import type { SyncLayer } from "../sync-layer/syncLayer";
import useBlockTransaction from "./blockTransaction";
import createUndoManager from "./undoManager";

///////////////////////////////////////////////////////////////////
// blocksManager 负责管理视图层的所有块，其职责有二：
// - 监听同步层的消息，并将同步层的更新同步到视图层
// - 将视图层的更新推送到同步层，这一过程通过（视图层）块事务完成
///////////////////////////////////////////////////////////////////

export const ROOT_BLOCK_ID = "root";
// 所有内部块的 parentId 都是这个
export const INTERNAL_BLOCK_PARENT_ID = "_internal";

// 记录事务的来源
// changeSources 是触发改变的来源，用于跳过某些 UI 更新
// 比如一个块内容改变会导致所有其他 occur block 的内容跟着改变
// 更新 UI 时，这个块时改变的源头，因此是不需要更新的
export const BlockOriginSchema = z
  .any()
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
      src: BlockId; // 镜像块的 src 只可能是 normalBlock
    }
  | {
      type: "virtualBlock";
      src: BlockId; // 虚拟块的 src 可能是 normalBlock 或 mirrorBlock
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

export type BlockTransactionMeta = {
  // 这个事务是否是撤销或重做事务
  isUndoRedo: boolean;
  // 这个事务是否需要自动添加撤销点
  autoAddUndoPoint: boolean;
  // 这个事务是否可以撤销
  canUndo: boolean;
  // 事务 undo 时，是将环境信息恢复到哪个阶段，默认为 beforeCommit
  envUndoStrategy: "create" | "beforeCommit";
  [key: string]: any;
};

export type BlockTransaction = {
  origin: BlockOrigin;
  patches: BlockPatch[];
  reversePatches: BlockPatch[];
  meta: BlockTransactionMeta;
  envInfo: {
    onCreate: TransactionEnvInfo;
    beforeCommit: TransactionEnvInfo | null;
    afterCommit: TransactionEnvInfo | null;
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
  onEachBlock: (block: Block, level: number) => void | Promise<void>;
  rootBlockId: BlockId;
  afterLeavingChildrens?: (block: Block, level: number) => void | Promise<void>;
  rootBlockLevel?: number;
  nonFoldOnly?: boolean;
  includeSelf?: boolean;
  // undefined -- 不改变
  // "ignore-descendants" -- 忽略子块
  // "ignore-self-and-descendants" -- 忽略自己及子块
  // "keep-self-and-descendants" -- 不管怎么样都不忽略，比如就算块是 fold 的，也会递归进入后代
  ignore?: (
    block: Block,
    level: number,
  ) =>
    | undefined
    | "ignore-descendants"
    | "ignore-self-and-descendants"
    | "keep-self-and-descendants";
};

type PendingTask<RET> = {
  promise: Promise<RET>;
  resolve: (value: RET) => void;
  reject: (reason?: any) => void;
  desc?: string;
};

export const BLOCK_DATA_MAP_NAME = "blockData";

export const cloneBlock = (block: Block | null): Block | null => {
  if (!block) return null;
  return {
    type: block.type,
    id: block.id,
    parentId: block.parentId,
    parentRef: block.parentRef,
    childrenIds: [...block.childrenIds],
    childrenRefs: [...block.childrenRefs],
    fold: block.fold,
    deleted: block.deleted,
    content: JSON.parse(JSON.stringify(block.content)),
    ctext: block.ctext,
    metadata: JSON.parse(JSON.stringify(block.metadata)),
    mtext: block.mtext,
    olinks: [...block.olinks],
    boosting: block.boosting,
    acturalSrc: block.acturalSrc,
    ...(block.type == "normalBlock" ? { docId: block.docId } : {}),
    ...(block.type == "mirrorBlock" ? { src: block.src } : {}),
    ...(block.type == "virtualBlock"
      ? { src: block.src, childrenCreated: block.childrenCreated }
      : {}),
    origin: block.origin,
  } as Block;
};

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
export const createBlocksManager = (yjsLayer: SyncLayer) => {
  const eventBus = useEventBus();
  const blocks = new Map<BlockId, ShallowRef<Block | null>>();

  // 记录最新收到的块信息和块数据
  const latestBlockInfos = new Map<BlockId, BlockInfo>();
  const latestBlockDatas = new Map<BlockId, BlockData>();
  const loadedDataDocs = new Set<number>(); // 记录已经加载的数据文档，防止重复加载

  const pendingTasks = {
    getBlockInfo: new Map<BlockId, PendingTask<BlockInfo>>(),
    getBlockData: new Map<BlockId, PendingTask<BlockData>>(),
  };

  const getBlockRef = (blockId: BlockId) => {
    let blockRef = blocks.get(blockId);
    if (!blockRef) {
      blockRef = shallowRef(null) as ShallowRef<Block | null>;
      blocks.set(blockId, blockRef);
    }
    return blockRef;
  };

  const getBlock = (blockId: BlockId, clone: boolean = true): Block | null => {
    const blockRef = getBlockRef(blockId);
    if (!blockRef.value) return null;
    if (clone) return cloneBlock(blockRef.value);
    return blockRef.value;
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

  const getBlockLevel = (blockId: BlockId) => {
    const path = getBlockPath(blockId);
    return path.length - 1;
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
        console.error("[blocksManager] cannot get path of ", rootBlockId);
        return;
      }
      rootBlockLevel = path.length - 1;
    }

    const dfs = (block: Block, currLevel: number) => {
      const ignoreResult = ignore?.(block, currLevel);
      if (ignoreResult === "ignore-self-and-descendants") return;
      if (includeSelf || block.id != rootBlockId) onEachBlock(block, currLevel);
      if (ignoreResult === "ignore-descendants") return;
      if (ignoreResult !== "keep-self-and-descendants" && nonFoldOnly && block.fold) return;
      if (typeof block.childrenIds == "string") return;
      for (const childRef of block.childrenRefs) {
        if (childRef.value && !childRef.value.deleted) {
          const rawBlock = toRaw(childRef.value);
          dfs(rawBlock, currLevel + 1);
        }
      }
      if (afterLeavingChildrens) afterLeavingChildrens(block, currLevel);
    };

    const rootBlock = getBlock(rootBlockId);
    if (!rootBlock) {
      console.error("[blocksManager] Cannot find root block", rootBlockId);
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
      console.warn("[blocksManager] unsupported block content type");
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

  const getOlinks = (docContent: any, type: "blockRef" | "tag" | "both" = "both") => {
    const doc = Node.fromJSON(pmSchema, docContent);
    const olinks: BlockId[] = [];
    // 从 content 中提取
    doc.descendants((node) => {
      if (node.isAtom && node.type.name == "blockRef_v2") {
        if (
          (type === "blockRef" && !node.attrs.tag) ||
          (type === "tag" && node.attrs.tag) ||
          type === "both"
        ) {
          olinks.push(node.attrs.toBlockId);
        }
      }
    });
    return olinks;
  };

  const getBlockInfoOrWait = async (blockId: BlockId): Promise<BlockInfo | null> => {
    // 如果已经有一个任务在等这个块的信息，则等待这个任务完成
    const task = pendingTasks.getBlockInfo.get(blockId);
    task && (await task.promise);

    // 尝试获取来源块的块信息
    let blockInfo = latestBlockInfos.get(blockId) ?? null;

    // 没有获取到，则创建一个 pendingTask 等待这个块的信息
    if (!blockInfo) {
      let resolve_, reject_;
      const getBlockInfoPromise = new Promise<BlockInfo>((resolve, reject) => {
        resolve_ = resolve;
        reject_ = reject;
      });
      pendingTasks.getBlockInfo.set(blockId, {
        promise: getBlockInfoPromise,
        resolve: resolve_!,
        reject: reject_!,
        desc: "getBlockInfo of " + blockId,
      });
      await getBlockInfoPromise;
    }

    // 再次获取块信息，这次一定有
    blockInfo = latestBlockInfos.get(blockId) ?? null;
    return blockInfo;
  };

  const getBlockDataOrWait = async (blockId: BlockId, docId: number): Promise<BlockData | null> => {
    // 尝试获取块数据
    // 如果已经有一个任务在等这个块的数据，则等待这个任务完成
    const task = pendingTasks.getBlockData.get(blockId);
    task && (await task.promise);

    // 先从 blocks 中获取，然后尝试从 latestBlockDatas 中获取
    let blockData: any;
    const block = getBlock(blockId);
    if (block) {
      blockData = [block.content, block.metadata];
    } else {
      blockData = latestBlockDatas.get(blockId) ?? null;
    }

    // 都没有获取到，则创建一个 pendingTask 等待这个块的数据
    if (!blockData) {
      if (!loadedDataDocs.has(docId)) {
        yjsLayer.loadDataDoc(docId);
        loadedDataDocs.add(docId);
      }

      let resolve_, reject_;
      const getBlockDataPromise = new Promise<BlockData>((resolve, reject) => {
        resolve_ = resolve;
        reject_ = reject;
      });
      pendingTasks.getBlockData.set(blockId, {
        promise: getBlockDataPromise,
        resolve: resolve_!,
        reject: reject_!,
        desc: "getBlockData of " + blockId,
      });
      await getBlockDataPromise;
    }

    // 再次获取块数据，这次一定有
    blockData = latestBlockDatas.get(blockId) ?? null;
    return blockData;
  };

  yjsLayer.on("blockDataMapChange", ({ docId, origin, changes }) => {
    const tr = createBlockTransaction(origin);
    if (origin.type == "ui") return; // 不处理本地事务，防止无限循环

    console.log("[blocksManager] in app, blockDataMapChange", dayjs().valueOf(), changes);

    for (const change of changes) {
      // 添加或更新一个块的块数据
      if (change.op == "upsert") {
        // 记录最新收到的块数据
        latestBlockDatas.set(change.key, change.value);

        // 所有在等这个块数据的任务都可以 resolve 了
        const task = pendingTasks.getBlockData.get(change.key);
        if (task) {
          task.resolve(change.value);
          pendingTasks.getBlockData.delete(change.key);
        }

        const blockRef = getBlockRef(change.key);
        // blocks 中有这个块，更新 blocks 中对应块的块数据
        if (blockRef.value != null && blockRef.value.type === "normalBlock") {
          const [content, metadata] = change.value;
          if (content == null) {
            console.error(
              "[blocksManager] blockDataMap changed, but normal block doesn't have content",
              change.key,
            );
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
      } else if (change.op == "delete") {
        // 删除一个块的块数据，也什么都不做。因为如果是自己删除的，那么应该已经从 blocks 里删除了，
        // 如果不是自己删除的，blockInfoMap 会监听到变化，然后更新 blocks。
        latestBlockDatas.delete(change.key);
      }
    }

    if (tr.patches.length > 0) {
      tr.commit();
    }
  });

  yjsLayer.on("blockInfoMapChange", ({ origin, changes }) => {
    const tr = createBlockTransaction(origin);
    if (origin.type === "ui") return; // 不处理本地事务，防止无限循环

    console.log("[blocksManager] in app, blockInfoMapChange", dayjs().valueOf(), changes);

    const promises: Promise<void>[] = [];

    for (const change of changes) {
      // 一个块被删除了
      if (change.op == "delete") {
        console.debug("[blocksManager] Processing delete action for block:", change.key);
        latestBlockInfos.delete(change.key);
        const block = blocks.get(change.key);
        if (block) {
          console.debug("[blocksManager] Deleting block from loadedBlocks:", change.key);
          tr.deleteBlock(change.key);
        }
      }

      // 一个块被添加或更新了
      else if (change.op == "upsert") {
        if (!change.value) {
          console.error("[blocksManager] upsert block info with empty value", change.key);
          continue;
        }
        const [status, parentId, childrenIds, docId, src] = change.value;
        const { type, fold } = extractBlockStatus(status);
        latestBlockInfos.set(change.key, change.value);

        // 添加或更新的块是普通块
        if (type == "normalBlock") {
          if (docId == null || !change.value) {
            continue;
          }

          const promise = (async () => {
            const blockData = await getBlockDataOrWait(change.key, docId);
            if (!blockData) {
              console.error("[blocksManager] Cannot find block data for block", change.key);
              return;
            }

            tr.addBlock({
              type: "normalBlock",
              id: change.key,
              parentId,
              childrenIds,
              fold,
              content: blockData[0],
              metadata: blockData[1],
              docId,
            } as AddBlockParams);
          })();

          promises.push(promise);
        }

        // 添加或更新的是镜像块或虚拟块
        else {
          if (!src || !change.value) {
            continue;
          }

          const promise = (async () => {
            const srcBlockInfo = await getBlockInfoOrWait(src);
            if (!srcBlockInfo) {
              console.error("[blocksManager] Cannot find block info for block", src);
              return;
            }

            const [srcStatus, _, srcChildrenIds, srcDocId] = srcBlockInfo;
            const { type: srcType, fold: srcFold } = extractBlockStatus(srcStatus);

            if (srcType == "normalBlock") {
              if (srcDocId == null) {
                console.error(
                  "[blocksManager] Src doc id is null, this should not happen",
                  change.key,
                );
                return;
              }

              console.log("[blocksManager] getBlockDataOrWait", src, srcDocId);
              const srcBlockData = await getBlockDataOrWait(src, srcDocId);
              if (!srcBlockData) {
                console.error("[blocksManager] Cannot find block data for block", src);
                return;
              }

              tr.addBlock({
                type,
                id: change.key,
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
              console.error("[blocksManager] Src type must be normalBlock, but got", srcType);
              return;
            }
          })();

          promises.push(promise);
        }
      }
    }

    // 等待所有异步任务完成后，提交块事务
    Promise.all(promises).then(() => {
      console.log("[blocksManager] in app, all resolved", dayjs().valueOf());
      tr.commit();
      console.log("[blocksManager] in app, transaction commit", dayjs().valueOf());
    });
  });

  const hasRootBlock = () => getBlockRef("root").value != null;

  const ensureTree = async (
    onNoRoot: () => void, // 当检测到没有根块时的回调
    onRootFound: () => void, // 当检测到根块时的回调
  ) => {
    //
    const check = () => {
      if (hasRootBlock()) {
        clearInterval(checkInterval);
        onRootFound();
      } else {
        onNoRoot();
      }
    };

    const checkInterval = setInterval(() => {
      check();
    }, 1000); // 每秒检查一次
    check();

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
        content: plainTextToTextContent(""),
        metadata: {},
      })
      .addBlock({
        type: "normalBlock",
        id: "root",
        fold: false,
        parentId: "root",
        childrenIds: [fstChildId],
        content: plainTextToTextContent(""),
        metadata: {},
      })
      .commit();
  };

  const getRootBlockRef = () => getBlockRef("root");

  const destroy = () => {
    blocks.clear();
    pendingTasks.getBlockInfo.clear();
    pendingTasks.getBlockData.clear();
    eventBus.emit("blocksDestroy");
  };

  const { createBlockTransaction, addBlock, updateBlock, deleteBlock } = useBlockTransaction({
    blocks,
    yjsLayer,
    latestBlockInfos,
    latestBlockDatas,
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
    latestBlockInfos,
    latestBlockDatas,
    pendingTasks,
    getBlock,
    getBlockRef,
    getRootBlockRef,
    getBlockPath,
    getBlockLevel,
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
