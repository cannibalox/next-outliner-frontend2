import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";
import { computed, ref } from "vue";

export const TokenContext = createContext(() => {
  // 使用 localStorage 存储 token
  const token = useLocalStorage("token", "");

  const tokenPayload = computed(() => {
    if (!token.value) return null;
    const base64Url = token.value.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  });

  const ctx = {
    token,
    tokenPayload,
  };
  // 将 ctx 暴露到 globalThis
  globalThis.getTokenContext = () => ctx;
  return ctx;
});

export default TokenContext;
