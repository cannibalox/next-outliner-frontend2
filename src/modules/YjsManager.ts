import { settings } from "@/modules/settings";
import { ref, type Ref } from "vue";
import * as Y from "yjs";
import type { BlockData, BlockInfo } from "./types";
// @ts-ignore
import { WebsocketProvider } from "@/common/yjs/y-websocket";
import { backendApi } from "@/modules/backendApi";
import { defineModule } from "@/common/module";
import type { BlockId } from "@/common/types";

export type YjsLayerPatch =
  | { op: "upsertBlockInfo"; blockId: BlockId; blockInfo: BlockInfo }
  | { op: "deleteBlockInfo"; blockId: BlockId }
  | { op: "upsertBlockData"; docId: number; blockId: BlockId; blockData: BlockData }
  | { op: "deleteBlockData"; docId: number; blockId: BlockId }

// YjsLayerTransaction 是 Yjs 文档层级的操作
// 如果不将操作表示为事务，而是直接 `yMap.set` 或 `yMap.delete`，会导致无法批量提交
// 因为不能在每个需要 set 或 delete 的地方都调用 yDoc.transact
export type YjsLayerTransaction = {
  patches: YjsLayerPatch[];
  upsertBlockInfo: (blockId: BlockId, blockInfo: BlockInfo) => void;
  deleteBlockInfo: (blockId: BlockId) => void;
  upsertBlockData: (docId: number, blockId: BlockId, blockData: BlockData) => void;
  deleteBlockData: (docId: number, blockId: BlockId) => void;
  // onLoad 是可选的，在加载一个新文档时调用
  commit: (onLoad?: (doc: Y.Doc) => void) => void;
}

const BLOCK_DATA_MAP_NAME = "blockData";

/**
 * 管理所有 Yjs Documents 的模块
 */
export const yjsManager = defineModule(
  "yjsManager",
  {settings, backendApi},
  ({ settings, backendApi }) => {
    // 基础文档，存有所有 block 基本信息（不包括数据 / 内容）的 blockInfoMap 存在这里面
    const baseDoc = ref<Y.Doc | null>(null);
    const blockInfoMap = ref<Y.Map<BlockInfo> | null>(null);
    // 所有 block 的数据 / 内容分散存储在多个 Yjs 文档中，可以按需加载 & 卸载
    const blockDataDocs = ref<Map<number, Y.Doc> | null>(null);
    const wsProvider = ref<WebsocketProvider | null>(null);

    const connect = () => {
      const { serverUrl, location } = settings;
      const { token } = backendApi;

      // close old ws
      disconnect();

      baseDoc.value = new Y.Doc({ guid: `${location.value ?? "temp"}base` });
      blockInfoMap.value = baseDoc.value.getMap("blockInfoMap");
      blockDataDocs.value = new Map();

      if (serverUrl.value?.length > 0 && location.value.length > 0) {
        if (token.value?.length > 0) {
          console.log(`连接到同步服务器，serverUrl=${serverUrl.value}, location=${location.value}`);
          wsProvider.value = new WebsocketProvider(
            `ws://${serverUrl.value}`,
            location.value,
            {
              params: {
                docname: "base", // TODO remove later
                location: location.value,
                authorization: token.value,
              },
            },
          );
          wsProvider.value.addDoc(baseDoc.value);
          wsProvider.value.connect();
        } else {
          console.error("token 为空，先登录以获得 token");
        }
      } else {
        console.log("未连接到同步服务器，所有修改刷新后会丢失！");
      }
    }

    const disconnect = () => {
      wsProvider.value?.disconnect();
      wsProvider.value?.destroy();
      baseDoc.value = null;
      blockInfoMap.value = null;
      blockDataDocs.value = null;
      wsProvider.value = null;
    }

    const getDataDoc = (docId: number, onLoad?: (doc: Y.Doc) => void) => {
      if (!blockDataDocs.value) {
        console.error("数据文档未初始化，先 connect 以初始化");
        return;
      }
      const { location } = settings;
      if (blockDataDocs.value?.has(docId)) {
        return blockDataDocs.value.get(docId);
      }
      const dataDoc = new Y.Doc({ guid: `${location.value ?? "temp"}${docId}` });
      blockDataDocs.value.set(docId, dataDoc);
      if (wsProvider.value) {
        console.log("dataDoc 加入 wsProvider，开始同步");
        wsProvider.value.addDoc(dataDoc);
      }
      onLoad?.(dataDoc);
      return dataDoc;
    }

    const unloadDataDoc = (docId: number) => {
      throw new Error("Not implemented");
    }

    const isSynced = (docGuid: string) => {
      if (!wsProvider.value) {
        console.error("未连接到同步服务器，无法查询同步状态");
        return false;
      }
      return wsProvider.value.isSynced(docGuid);
    }

    const whenSynced = (docGuid: string, interval: number = 200) => new Promise((resolve) => {
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

    const createYjsLayerTransaction = () => {
      const tr: YjsLayerTransaction = {
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
          }, baseDoc.value.clientID);
          console.log("send origin", baseDoc.value.clientID);
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
            const dataDoc = getDataDoc(docId, onLoad);
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
            }, dataDoc.clientID);
          }
        }
      };

      return tr;
    }

    return {
      connect,
      disconnect,
      // 任何关于文档是否同步的查询都需要通过此 API
      // 不要使用 Doc.isSynced 或 isLoaded！！！！！！
      isSynced,
      whenSynced,
      getDataDoc,
      unloadDataDoc,
      allSyncedRef,
      createYjsLayerTransaction,
      // 手工 as 指定类型，防止 ts 推导出超级长的类型导致错误
      wsProvider,
      baseDoc: baseDoc as Ref<Y.Doc | null>,
      blockInfoMap: blockInfoMap as Ref<Y.Map<BlockInfo> | null>,
      blockDataDocs: blockDataDocs as Ref<Map<number, Y.Doc> | null>,
    };
  }
)