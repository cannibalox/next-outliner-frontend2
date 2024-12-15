import { ref, toRaw, type Ref } from "vue";
import * as Y from "yjs";
import type { BlockData, BlockInfo } from "@/common/types";
// @ts-ignore
import { WebsocketProvider } from "@/common/yjs/y-websocket";
import type { BlockId } from "@/common/types";
import type { BlockOrigin } from "../app-state-layer/blocksManager";
import { IndexeddbPersistence } from "./indexeddbPersistence";
import mitt from "mitt";

export type YjsLayerPatch =
  | { op: "upsertBlockInfo"; blockId: BlockId; blockInfo: BlockInfo }
  | { op: "deleteBlockInfo"; blockId: BlockId }
  | { op: "upsertBlockData"; docId: number; blockId: BlockId; blockData: BlockData }
  | { op: "deleteBlockData"; docId: number; blockId: BlockId };

// YjsLayerTransaction 是 Yjs 文档层级的操作
// 如果不将操作表示为事务，而是直接 `yMap.set` 或 `yMap.delete`，会导致无法批量提交
// 因为不能在每个需要 set 或 delete 的地方都调用 yDoc.transact
export type YjsLayerTransaction = {
  patches: YjsLayerPatch[];
  origin: BlockOrigin;
  upsertBlockInfo: (blockId: BlockId, blockInfo: BlockInfo) => void;
  deleteBlockInfo: (blockId: BlockId) => void;
  upsertBlockData: (docId: number, blockId: BlockId, blockData: BlockData) => void;
  deleteBlockData: (docId: number, blockId: BlockId) => void;
  // onLoad 是可选的，在加载一个新文档时调用
  commit: (onLoad?: (doc: Y.Doc) => void) => void;
};

type YjsLayerEvents = {
  blockInfoCreated: [doc: Y.Doc];
  blockInfoLoaded: [doc: Y.Doc];
  blockInfoSynced: [doc: Y.Doc]; // not used
  blockDataCreated: [docId: number, doc: Y.Doc];
  blockDataLoaded: [docId: number, doc: Y.Doc];
  blockDataSynced: [docId: number, doc: Y.Doc]; // not used
};

const BLOCK_DATA_MAP_NAME = "blockData";
const BLOCK_INFO_DB_NAME = "block_info";
const BLOCK_DATA_DB_PREFIX = "block_data_";

// 创建一个 Yjs 层，对外提供：
// 1. yjsLayerTransaction 用于 push 新数据
// 2. baseDoc、blockInfoMap、blockDataDocs 等最新的数据
export const createYjsLayer = () => {
  // 基础文档，存有所有 block 基本信息（不包括数据 / 内容）的 blockInfoMap 存在这里面
  const baseDoc = ref<Y.Doc | null>(null);
  const blockInfoMap = ref<Y.Map<BlockInfo> | null>(null);
  // 所有 block 的数据 / 内容分散存储在多个 Yjs 文档中，可以按需加载 & 卸载
  const blockDataDocs = ref<Map<number, Y.Doc> | null>(null);
  const wsProvider = ref<WebsocketProvider | null>(null);
  const baseDocIdb = ref<IndexeddbPersistence | null>(null);
  const blockDataIdbs = ref<Map<number, IndexeddbPersistence> | null>(null);
  const eventBus = mitt<YjsLayerEvents>();

  let serverUrl: string | null = null;
  let location: string | null = null;

  let loadBlockDataFromLocal: ((docId: number, doc: Y.Doc) => Promise<void>) | null = null;

  const bindLocalDb = async () => {
    if (!baseDoc.value) return;
    baseDocIdb.value = new IndexeddbPersistence(BLOCK_INFO_DB_NAME, baseDoc.value);

    loadBlockDataFromLocal = async (docId, doc) => {
      if (!blockDataIdbs.value) blockDataIdbs.value = new Map<number, IndexeddbPersistence>();
      const idbs = blockDataIdbs.value;
      const idb = new IndexeddbPersistence(BLOCK_DATA_DB_PREFIX + docId, doc);
      idbs.set(docId, idb);
      await idb.whenSynced;
    };

    await baseDocIdb.value.whenSynced; // 等待同步完成
  };

  const connect = async (serverUrl_: string, location_: string, token: string) => {
    disconnect();

    serverUrl = serverUrl_;
    location = location_;

    baseDoc.value = new Y.Doc({ guid: `${location ?? "temp"}base` });
    blockInfoMap.value = baseDoc.value.getMap("blockInfoMap");
    blockDataDocs.value = new Map();

    // console.log("从本地加载 blockInfo");
    // eventBus.emit("blockInfoCreated", [baseDoc.value]);
    // await bindLocalDb();
    // console.log(`从本地加载数据完成，现在有 ${blockInfoMap.value?.size} 个块`);
    // eventBus.emit("blockInfoLoaded", [baseDoc.value]);

    console.log(`连接到同步服务器，serverUrl=${serverUrl}, location=${location}`);
    wsProvider.value = new WebsocketProvider(`ws://${serverUrl}`, location, {
      params: {
        docname: "base", // TODO remove later
        location: location,
        authorization: token,
      },
    });
    wsProvider.value.addDoc(baseDoc.value);
    wsProvider.value.connect();
  };

  const disconnect = () => {
    wsProvider.value?.disconnect();
    wsProvider.value?.destroy();
    baseDoc.value = null;
    blockInfoMap.value = null;
    blockDataDocs.value = null;
    wsProvider.value = null;
  };

  const getDataDoc = (docId: number) => {
    if (!blockDataDocs.value) {
      console.error("数据文档未初始化，先 connect 以初始化");
      return;
    }
    if (blockDataDocs.value?.has(docId)) {
      return blockDataDocs.value.get(docId);
    }
    const dataDoc = new Y.Doc({ guid: `${location ?? "temp"}${docId}` });
    blockDataDocs.value.set(docId, dataDoc);
    eventBus.emit("blockDataCreated", [docId, dataDoc]);

    (async () => {
      if (loadBlockDataFromLocal) {
        console.log("从本地加载 blockData");
        await loadBlockDataFromLocal?.(docId, dataDoc);
        console.log("从本地加载 blockData 完成");
        eventBus.emit("blockDataLoaded", [docId, dataDoc]);
      }

      if (wsProvider.value) {
        console.log("dataDoc 加入 wsProvider，开始同步");
        wsProvider.value.addDoc(dataDoc);
      }
    })();

    return dataDoc;
  };

  const unloadDataDoc = (docId: number) => {
    throw new Error("Not implemented");
  };

  const isSynced = (docGuid: string) => {
    if (!wsProvider.value) {
      console.error("未连接到同步服务器，无法查询同步状态");
      return false;
    }
    return wsProvider.value.isSynced(docGuid);
  };

  const whenSynced = (docGuid: string, interval: number = 200) =>
    new Promise((resolve) => {
      const handler = setInterval(() => {
        if (wsProvider.value?.isSynced(docGuid)) {
          clearInterval(handler);
          resolve(undefined);
        }
      }, interval);
    });

  const allSyncedRef = ref(false);

  setInterval(() => {
    if (!wsProvider.value) {
      allSyncedRef.value = false;
      return;
    }
    let result = true;
    for (const doc of wsProvider.value.docs.values()) {
      const docGuid = doc.guid;
      if (!wsProvider.value?.isSynced(docGuid)) {
        result = false;
        break;
      }
    }
    allSyncedRef.value = result;
  }, 1000);

  const createYjsLayerTransaction = (origin: BlockOrigin) => {
    const tr: YjsLayerTransaction = {
      origin,
      patches: [],
      upsertBlockInfo: (blockId, blockInfo) => {
        tr.patches.push({ op: "upsertBlockInfo", blockId, blockInfo });
      },
      deleteBlockInfo: (blockId) => {
        tr.patches.push({ op: "deleteBlockInfo", blockId });
      },
      upsertBlockData: (docId, blockId, blockData) => {
        tr.patches.push({ op: "upsertBlockData", docId, blockId, blockData });
      },
      deleteBlockData: (docId, blockId) => {
        tr.patches.push({ op: "deleteBlockData", docId, blockId });
      },
      commit: (onLoad?: (doc: Y.Doc) => void) => {
        if (!baseDoc.value || !blockInfoMap.value) {
          console.error("baseDoc or blockInfoMap is null, cannot commit");
          return;
        }
        // 先处理 blockInfoMap 的变更
        baseDoc.value.transact(() => {
          if (!blockInfoMap.value) return;
          for (const p of tr.patches) {
            if (p.op === "upsertBlockInfo") {
              blockInfoMap.value.set(p.blockId, p.blockInfo);
            } else if (p.op === "deleteBlockInfo") {
              blockInfoMap.value.delete(p.blockId);
            }
          }
        }, tr.origin);
        // 再处理 blockData 的变更
        // 将所有对同一个文档的变更合到一起
        const doc2patches = new Map<number, YjsLayerPatch[]>();
        for (const p of tr.patches) {
          if (p.op === "upsertBlockData" || p.op === "deleteBlockData") {
            const patches = doc2patches.get(p.docId);
            if (!patches) {
              doc2patches.set(p.docId, [p]);
            } else {
              patches.push(p);
            }
          }
        }
        for (const [docId, patches] of doc2patches.entries()) {
          const dataDoc = getDataDoc(docId);
          // 每个文档分别事务
          dataDoc?.transact(() => {
            const blockDataMap = dataDoc.getMap<BlockData>(BLOCK_DATA_MAP_NAME);
            for (const p of patches) {
              if (p.op === "upsertBlockData") {
                blockDataMap.set(p.blockId, p.blockData);
              } else if (p.op === "deleteBlockData") {
                blockDataMap.delete(p.blockId);
              }
            }
          }, tr.origin);
        }
      },
    };

    return tr;
  };

  const isRemoteTr = (tr: { origin: any }) => {
    return tr.origin === wsProvider.value; // TODO
  };

  const ret = {
    connect,
    disconnect,
    // 任何关于文档是否同步的查询都需要通过此 API
    // 不要使用 Doc.isSynced 或 isLoaded！！！！！！
    isSynced,
    whenSynced,
    getDataDoc,
    unloadDataDoc,
    isRemoteTr,
    allSyncedRef,
    createYjsLayerTransaction,
    // 手工 as 指定类型，防止 ts 推导出超级长的类型导致错误
    wsProvider,
    baseDoc: baseDoc as Ref<Y.Doc | null>,
    blockInfoMap: blockInfoMap as Ref<Y.Map<BlockInfo> | null>,
    blockDataDocs: blockDataDocs as Ref<Map<number, Y.Doc> | null>,
    on: eventBus.on,
    off: eventBus.off,
  };
  return ret;
};

export type YjsLayer = ReturnType<typeof createYjsLayer>;
