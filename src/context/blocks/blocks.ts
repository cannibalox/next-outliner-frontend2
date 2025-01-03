import { createContext } from "@/utils/createContext";
import { createSyncLayer } from "./sync-layer/syncLayer";
import { createBlocksManager } from "./view-layer/blocksManager";
import { createBlocksEditor } from "./view-layer/blocksEditor";
import { useRouterParams } from "@/utils/routerParams";
import { computed, watch } from "vue";
import ServerInfoContext from "../serverInfo";

export const BlocksContext = createContext(() => {
  const params = useRouterParams();
  const { token } = ServerInfoContext.useContext();
  const syncLayer = createSyncLayer();
  const blocksManager = createBlocksManager(syncLayer);
  const blockEditor = createBlocksEditor(blocksManager);

  watch(
    params,
    (newParams) => {
      syncLayer.disconnect();
      const { serverUrl, location } = newParams ?? {};
      if (!serverUrl || !location || !token.value) return;
      syncLayer.connect(decodeURIComponent(serverUrl), decodeURIComponent(location), token.value);
    },
    { immediate: true },
  );

  const ctx = {
    blocksManager,
    blockEditor,
    syncLayer,
    syncStatus: syncLayer.syncStatus,
    synced: blocksManager.synced,
  };
  // 通过 globalThis 暴露给组件外使用
  globalThis.getBlocksContext = () => ctx;
  return ctx;
});

export default BlocksContext;
