import { createContext } from "@/utils/createContext";
import { createYjsLayer } from "./sync-layer/yjsLayer";
import { createBlocksManager } from "./app-state-layer/blocksManager";
import { createBlocksEditor } from "./app-state-layer/blocksEditor";
import { useRouterParams } from "@/utils/routerParams";
import { watch } from "vue";
import ServerInfoContext from "../serverInfo";

export const BlocksContext = createContext(() => {
  const params = useRouterParams();
  const { token } = ServerInfoContext.useContext();
  const yjsLayer = createYjsLayer();
  const blocksManager = createBlocksManager(yjsLayer);
  const blockEditor = createBlocksEditor(blocksManager);

  watch(
    params,
    (newParams) => {
      yjsLayer.disconnect();
      const { serverUrl, location } = newParams ?? {};
      if (!serverUrl || !location || !token.value) return;
      yjsLayer.connect(decodeURIComponent(serverUrl), decodeURIComponent(location), token.value);
    },
    { immediate: true },
  );

  const ctx = {
    blocksManager,
    blockEditor,
    yjsLayer,
    synced: yjsLayer.allSyncedRef,
  };
  // 通过 globalThis 暴露给组件外使用
  globalThis.getBlocksContext = () => ctx;
  return ctx;
});

export default BlocksContext;
