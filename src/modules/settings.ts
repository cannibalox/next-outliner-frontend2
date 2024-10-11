import { ref, type Ref } from "vue";
import { defineModule, type _ModuleDef, type ModuleInstance } from "./registry";

export const settings = defineModule(
  "settings",
  [],
  async () => {
    const serverUrl = ref("");
    const location = ref("");

    return {
      serverUrl,
      location,
    };
  },
);