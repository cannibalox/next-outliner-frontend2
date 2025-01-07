import type { BlockData } from "@/common/type-and-schemas/block/block-data";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { BlockInfo } from "@/common/type-and-schemas/block/block-info";
import { createPromise } from "@/utils/promise";
import mitt from "mitt";
import type { BlockOrigin } from "../view-layer/blocksManager";
import type {
  MapChange,
  SyncLayerTransaction,
  SyncWorkerInMsg,
  SyncWorkerOutMsg,
} from "./syncWorker";

///////////////////////////////////////////////////////////////////
// SyncLayer 是对 syncWorker 的很薄的一层封装
// 将消息发送与接受的工作封装成若干函数
// 具体来说，对外提供
// - connect 连接到服务器
// - disconnect 断开连接
// - loadDataDoc 加载数据文档
// - unloadDataDoc 卸载数据文档
// - createYjsLayerTransaction 创建一个同步层事务
// - syncStatus 当前各个文档的同步状态
// 注意，syncStatus 反映的是 syncWorker 中文档的同步状态，而不是 blocksManager#blocks 的同步状态。
// 即可能 syncWorker 已经同步完了，但 blocksManager 中在处理 changes，没有同步完
///////////////////////////////////////////////////////////////////

export type SyncLayerTransactionWrapper = {
  _tr: SyncLayerTransaction;
  upsertBlockInfo: (blockId: BlockId, blockInfo: BlockInfo) => void;
  deleteBlockInfo: (blockId: BlockId) => void;
  upsertBlockData: (docId: number, blockId: BlockId, blockData: BlockData) => void;
  deleteBlockData: (docId: number, blockId: BlockId) => void;
  commit: () => void;
};

export type SyncLayerEvents = {
  docSynced: { docId: string; hasSyncEvent: boolean };
  disconnected: void;
  dataDocCreated: { docId: number };
  blockInfoMapChange: { changes: MapChange[]; origin: BlockOrigin };
  blockDataMapChange: { docId: number; changes: MapChange[]; origin: BlockOrigin };
};

export type SyncStatus = "synced" | "disconnected";

// 创建一个 Sync 层
export const createSyncLayer = () => {
  const eventBus = mitt<SyncLayerEvents>();
  const { promise: syncWorkerStarted, resolve: resolveSyncWorkerStarted } = createPromise();

  const worker = new Worker(new URL("@/context/blocks/sync-layer/syncWorker.ts", import.meta.url), {
    type: "module",
  });

  worker.addEventListener("message", (message) => {
    const msg = message.data as SyncWorkerOutMsg;
    if (msg.type === "init") {
      resolveSyncWorkerStarted(undefined);
      return;
    }
    // 将其他消息转发到事件总线
    console.debug("[syncLayer] Received message from syncWorker:", msg);
    eventBus.emit(msg.type, msg as any); // XXX
  });

  const postWorkerMsg = (msg: SyncWorkerInMsg) => {
    (async () => {
      await syncWorkerStarted; // 等待 syncWorker 启动后才发送消息
      worker.postMessage(msg);
    })();
  };

  const connect = (serverUrl: string, location: string, token: string) => {
    postWorkerMsg({ type: "connect", serverUrl, location, token });
  };

  const disconnect = () => {
    postWorkerMsg({ type: "disconnect" });
  };

  const loadDataDoc = (docId: number) => {
    postWorkerMsg({ type: "loadDataDoc", docId });
  };

  const unloadDataDoc = (docId: number) => {
    postWorkerMsg({ type: "unloadDataDoc", docId });
  };

  const _printBlockInfo = (blockId: BlockId) => {
    postWorkerMsg({ type: "_printBlockInfo", blockId });
  };

  const _printBlockData = (docId: number, blockId: BlockId) => {
    postWorkerMsg({ type: "_printBlockData", docId, blockId });
  };

  // 创建一个同步层事务
  // 这是一个简单的包装类，将事务对象的创建与提交封装成若干函数
  const createSyncLayerTransaction = (origin: BlockOrigin) => {
    const trWrapper: SyncLayerTransactionWrapper = {
      _tr: { patches: [], origin },
      upsertBlockInfo: (blockId, blockInfo) => {
        trWrapper._tr.patches.push({ op: "upsertBlockInfo", blockId, blockInfo });
      },
      deleteBlockInfo: (blockId) => {
        trWrapper._tr.patches.push({ op: "deleteBlockInfo", blockId });
      },
      upsertBlockData: (docId, blockId, blockData) => {
        trWrapper._tr.patches.push({ op: "upsertBlockData", docId, blockId, blockData });
      },
      deleteBlockData: (docId, blockId) => {
        trWrapper._tr.patches.push({ op: "deleteBlockData", docId, blockId });
      },
      commit: () => {
        if (trWrapper._tr.patches.length === 0) return;
        postWorkerMsg({ type: "postYjsLayerTransaction", transaction: trWrapper._tr });
      },
    };
    return trWrapper;
  };

  const ret = {
    connect,
    disconnect,
    on: eventBus.on,
    off: eventBus.off,
    createSyncLayerTransaction,
    loadDataDoc,
    unloadDataDoc,
    _printBlockInfo,
    _printBlockData,
  };
  return ret;
};

export type SyncLayer = ReturnType<typeof createSyncLayer>;
