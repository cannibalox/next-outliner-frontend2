import { settings } from "@/modules/settings";
import { ref, type Ref } from "vue";
import * as Y from "yjs";
import type { BlockInfo } from "./types";
// @ts-ignore
import { WebsocketProvider } from "@/common/yjs/y-websocket";
import { backendApi } from "@/modules/backendApi";
import { defineModule } from "@/common/module";

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

    const loadDataDoc = (docId: number) => {
      if (!blockDataDocs.value) {
        console.error("数据文档未初始化，先 connect 以初始化");
        return;
      }
      const { location } = settings;
      if (blockDataDocs.value?.has(docId)) {
        console.log(`数据文档 ${docId} 已加载，什么都不做`);
        return blockDataDocs.value.get(docId);
      }
      const dataDoc = new Y.Doc({ guid: `${location.value ?? "temp"}${docId}` });
      blockDataDocs.value.set(docId, dataDoc);
      if (wsProvider.value) {
        console.log("dataDoc 加入 wsProvider，开始同步");
        wsProvider.value.addDoc(dataDoc);
      }
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

    return {
      connect,
      disconnect,
      // 任何关于文档是否同步的查询都需要通过此 API
      // 不要使用 Doc.isSynced 或 isLoaded！！！！！！
      isSynced,
      whenSynced,
      loadDataDoc,
      unloadDataDoc,
      // 手工 as 指定类型，防止 ts 推导出超级长的类型导致错误
      wsProvider,
      baseDoc: baseDoc as Ref<Y.Doc | null>,
      blockInfoMap: blockInfoMap as Ref<Y.Map<BlockInfo> | null>,
      blockDataDocs: blockDataDocs as Ref<Map<number, Y.Doc> | null>,
    };
  }
)