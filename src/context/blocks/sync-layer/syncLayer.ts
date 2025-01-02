import { ref, toRaw, type Ref } from "vue";
import * as Y from "yjs";
import type { BlockData } from "@/common/type-and-schemas/block/block-data";
import type { BlockInfo } from "@/common/type-and-schemas/block/block-info";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { BlockOrigin } from "../view-layer/blocksManager";
import mitt from "mitt";
import type {
  MapChange,
  SyncLayerTransaction,
  SyncWorkerInMsg,
  SyncWorkerOutMsg,
} from "./syncWorker";
import { createPromise } from "@/utils/promise";
import type { SyncStatus_Internal } from "./wsSynchronizer";
import { BLOCK_DATA_DOC_NAME_PREFIX, BLOCK_INFO_DOC_NAME } from "@/common/constants";

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
  syncStatus: { syncStatus: SyncStatus_Internal; docGuid?: string };
  dataDocCreated: { docId: number };
  blockInfoMapChange: { changes: MapChange[]; origin: BlockOrigin };
  blockDataMapChange: { docId: number; changes: MapChange[]; origin: BlockOrigin };
};

export type SyncStatus = "synced" | "disconnected";

// 创建一个 Sync 层
export const createSyncLayer = () => {
  const eventBus = mitt<SyncLayerEvents>();
  // docName -> syncStatus
  // XXX: 目前 docId 前端有两个意思，一个是 data doc 的 id，类型是 number
  // 另一个是一个文档的统一标识，格式如下：
  // - block_info
  // - blockData_<docId>
  // 有时间需要统一一下
  const syncStatus = ref<Map<string, SyncStatus>>(new Map());
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
    // 更新同步状态
    if (msg.type === "syncStatus") {
      // 如果连接断开，则所有文档的同步状态都设为断开
      if (msg.syncStatus === "disconnected") {
        for (const docId of syncStatus.value.keys()) {
          syncStatus.value.set(docId, "disconnected");
        }
      } else {
        // 如果连接成功，则设置对应文档的同步状态
        syncStatus.value.set(msg.docId, msg.syncStatus);
      }
    }
    // 将其他消息转发到事件总线
    console.debug("[syncLayer] Received message from syncWorker:", msg);
    eventBus.emit(msg.type, msg);
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
    syncStatus,
    createSyncLayerTransaction,
    loadDataDoc,
    unloadDataDoc,
    _printBlockInfo,
    _printBlockData,
  };
  return ret;
};

export type SyncLayer = ReturnType<typeof createSyncLayer>;
