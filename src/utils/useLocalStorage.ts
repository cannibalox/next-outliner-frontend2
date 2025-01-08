import { syncRef, useLocalStorage } from "@vueuse/core";
import { ref, type Ref, watch } from "vue";

// 类似 @vueuse/core 的 useLocalStorage，但 key 是 ref
const useLocalStorage2 = (keyRef: Ref<string | null | undefined>, initValue: any) => {
  const value = ref(initValue);

  watch(
    keyRef,
    (key, _, onCleanup) => {
      if (!key) return;
      const valueInLocalStorage = useLocalStorage(key, initValue);
      // 这里需要有 immediate，保证从 localStorage 中读取到最新的值
      const unSync1 = syncRef(value, valueInLocalStorage, { immediate: true, direction: "rtl" });
      // 这里不能有 immediate，防止将无效值写入 localStorage
      const unSync2 = syncRef(value, valueInLocalStorage, { direction: "ltr" });
      // 再次运行时，需要先取消之前的同步，防止反复写入无效值
      onCleanup(() => {
        unSync1();
        unSync2();
      });
    },
    { immediate: true },
  );

  return value;
};

export default useLocalStorage2;
