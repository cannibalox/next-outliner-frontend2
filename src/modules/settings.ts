import { ref } from "vue";
import { defineModule } from "../common/module";

/**
 * 设置模块
 */
export const settings = defineModule(
  "settings",
  {},
  async () => {
    const serverUrl = ref("");
    const location = ref("");

    return {
      serverUrl,
      location,
    };
  },
);