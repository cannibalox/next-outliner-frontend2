import "./assets/main.css";
import { createApp, ref, type Ref } from "vue";
import App from "./App.vue";
import router from "./router";
import { buildModules } from "./common/module";
import { settings } from "./modules/settings";
import { backendApi } from "./modules/backendApi";
import { blocksManager } from "./modules/blocksManager";
import { yjsManager } from "./modules/YjsManager";
import { taskQueue } from "./modules/taskQueue";
import { blockEditor } from "./modules/blockEditor";
import { eventBus } from "./modules/eventBus";
import { blockTreeRegistry } from "./modules/blockTreeRegistry";
import { globalUiVars } from "./modules/globalUiVars";
import { keymapManager } from "./modules/keymapManager";
import { importer } from "./modules/importer";
import type { Block } from "./common/types";
import { fulltextSearch } from "./modules/fulltextSearch";

const app = createApp(App);
export let globalEnv: Awaited<ReturnType<typeof initGlobalEnv>>;
export const loaded = ref(false);

const initGlobalEnv = async () => {
  const env = await buildModules({
    backendApi,
    settings,
    blocksManager,
    blockEditor,
    yjsManager,
    taskQueue,
    eventBus,
    blockTreeRegistry,
    globalUiVars,
    keymapManager,
    importer,
    fulltextSearch,
  });
  (window as any).globalEnv = env;
  env.settings.serverUrl.value = "localhost:8081";
  env.settings.location.value = "C:\\Users\\xiang\\Desktop\\test-db";
  await env.backendApi.login({ password: "Stardust's Next Outliner 2017949" });
  console.log("login success, token:", env.backendApi.token.value);
  await env.yjsManager.connect();
  console.log("connected");
  await env.blocksManager.ensureTree();
  return env;
};

const startApp = async () => {
  // app.use(router);
  app.mount("#app");
  globalEnv = await initGlobalEnv();
  loaded.value = true;

  // 热更新环境
  const hmr = import.meta.hot;
  if (hmr) {
    if (hmr.data.stop) {
      await hmr.data.stop();
    }

    hmr.data.stop = async () => {
      globalEnv.yjsManager.disconnect();
    }
  }
};

document.addEventListener("DOMContentLoaded", startApp);