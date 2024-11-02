// import axios from "axios";
// import { computed, ref } from "vue";
// import { defineModule } from "../common/module";
// import { settings } from "./settings";

// export const axiosManager = defineModule("axiosManager", { settings } as const, ({ settings }) => {
//   const token = ref("");

//   const api = computed(() => {
//     if (!settings?.serverUrl?.value) return null;
//     return axios.create({
//       baseURL: `http://${settings.serverUrl.value}`,
//       timeout: 10000,
//       headers: {
//         Authorization: token.value,
//       },
//     });
//   });

//   // 将 getAxios 挂载到 globalThis，以供 createPostApi 使用
//   (globalThis as any).getAxios = () => api.value;

//   return { token };
// });
