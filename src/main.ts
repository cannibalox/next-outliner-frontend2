import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import "./assets/main.css";
import { eventbusPlugin } from "./plugins/eventbus";
import { messages } from "./plugins/i18n";
import router from "./router";
import App from "./views/App.vue";
import { taskQueuePlugin } from "./plugins/taskQueue";
import "prosemirror-view/style/prosemirror.css";

const startApp = async () => {
  const i18n = createI18n({
    legacy: false,
    locale: "en_US",
    fallbackLocale: "en_US",
    messages,
  });

  const app = createApp(App);
  app.use(i18n);
  app.use(router);
  app.use(eventbusPlugin);
  app.use(taskQueuePlugin);
  app.mount("#app");
};

document.addEventListener("DOMContentLoaded", startApp);
