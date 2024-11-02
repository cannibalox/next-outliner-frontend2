import { createContext } from "@/utils/createContext";
import axios from "axios";
import { TokenContext } from "./token";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { watch } from "vue";

export const AxiosContext = createContext(() => {
  const { token } = TokenContext.useContext();
  const serverUrl = ref<string>("");
  const route = useRoute();

  watch(() => route.params.serverUrl, (newServerUrl) => {
      if (newServerUrl != null)
        serverUrl.value = newServerUrl as string;
      else serverUrl.value = "";
    },
    { immediate: true }
  );

  const axiosInstance = computed(() => {
    return axios.create({
      baseURL: `http://${serverUrl.value}`,
      timeout: 10000,
      headers: {
        Authorization: token.value,
      },
    });
  });

  const getAxios = () => {
    return axiosInstance.value;
  }

  const ctx = {
    serverUrl,
    getAxios,
  };

  // 通过 globalThis 暴露给组件外使用
  globalThis.getAxios = getAxios;
  globalThis.getAxiosContext = () => ctx;

  return ctx;
});

export default AxiosContext;
