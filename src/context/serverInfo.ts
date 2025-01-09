import { JwtPayloadSchema } from "@/common/type-and-schemas/jwtPayload";
import router from "@/router";
import { createContext } from "@/utils/createContext";
import { useRouterParams } from "@/utils/routerParams";
import useLocalStorage2 from "@/utils/useLocalStorage";
import axios from "axios";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { z } from "zod";

const normalizeServerUrl = (serverUrl: string) => {
  // add protocol if not exists
  // localhost:8080 -> https://localhost:8080
  // http://localhost:8080 -> http://localhost:8080 (unchange)
  // https://localhost:8080 -> https://localhost:8080 (unchange)
  if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
    return `https://${serverUrl}`;
  }
  return serverUrl;
};

export const ServerInfoContext = createContext(() => {
  const serverUrl = ref<string>("");
  const route = useRoute();
  const params = useRouterParams();
  const kbPrefix = computed(() => {
    const serverUrl = params.value?.serverUrl;
    const location = params.value?.location;
    if (!serverUrl || !location) return null;
    return `${serverUrl}-${location}-`;
  });

  // token 存在 localStorage 中
  // 但存储的键需要根据 serverUrl 和 location 生成
  // 因此我们监听 serverUrl 和 location，并从 localStorage 中获取 token
  const buildAdminTokenKey = (serverUrl: string) => `${serverUrl}-admin-token`;
  const buildKbEditorTokenKey = (serverUrl: string, location: string) =>
    `${serverUrl}-${location}-token`;
  const tokenKey = computed(() => {
    const serverUrl = params.value?.serverUrl;
    const location = params.value?.location;
    if (serverUrl && !location)
      return buildAdminTokenKey(serverUrl); // XXX 更详细的检查
    else if (serverUrl && location) return buildKbEditorTokenKey(serverUrl, location);
    else return null;
  });
  const token = useLocalStorage2(tokenKey, "");

  const extractTokenPayload = (token: string) => {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const validationResult = z
      .string()
      .transform((s) => {
        try {
          return JSON.parse(s);
        } catch (e) {
          return null;
        }
      })
      .pipe(JwtPayloadSchema)
      .safeParse(jsonPayload);
    return validationResult.success ? validationResult.data : null;
  };

  const tokenPayload = computed(() => {
    if (!token.value) return null;
    return extractTokenPayload(token.value);
  });

  const logout = () => {
    token.value = "";
    serverUrl.value = "";
    router.replace("/login/admin");
  };

  // 监听路由参数中的 serverUrl，并更新 serverUrl
  watch(
    () => route.params.serverUrl,
    (newServerUrl) => {
      if (newServerUrl != null) serverUrl.value = newServerUrl as string;
      else serverUrl.value = "";
    },
    { immediate: true },
  );

  const axiosInstance = computed(() => {
    return axios.create({
      baseURL: normalizeServerUrl(serverUrl.value),
      timeout: 10000,
      headers: {
        Authorization: token.value,
      },
    });
  });

  const getAxios = () => {
    return axiosInstance.value;
  };

  const ctx = {
    token,
    buildKbEditorTokenKey,
    buildAdminTokenKey,
    tokenPayload,
    extractTokenPayload,
    kbPrefix,
    serverUrl,
    getAxios,
    logout,
  };

  // 通过 globalThis 暴露给组件外使用
  globalThis.getAxios = getAxios;
  globalThis.getServerInfoContext = () => ctx;

  return ctx;
});

export default ServerInfoContext;
