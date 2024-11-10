import { createContext } from "@/utils/createContext";
import BlocksContext from "./blocks-provider/blocks";
import { computed, readonly, ref, shallowRef, watch, type ShallowRef } from "vue";
import type { BlockId } from "@/common/types";
import type { Block } from "./blocks-provider/blocksManager";
import { syncRef, useLocalStorage } from "@vueuse/core";
import { useEventBus } from "@/plugins/eventbus";

const MainTreeContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext();
  const eventBus = useEventBus();

  const mainRootBlockId = useLocalStorage("mainRootBlockId", "root");
  const mainRootBlockRef = shallowRef<Block | null>(null);
  const mainRootBlockPath = shallowRef<Block[]>([]);

  watch(mainRootBlockId, (newVal) => {
    const mainRootBlockRef2 = blocksManager.getBlockRef(newVal);
    syncRef(mainRootBlockRef, mainRootBlockRef2, { direction: "rtl" });

    // 重新计算 mainRootBlockPath
    const path = blocksManager.getBlockPath(mainRootBlockId.value);
    mainRootBlockPath.value = path;
  }, { immediate: true });

  // XXX: 每次提交块事务，都重新计算 mainRootBlockPath
  eventBus.on("afterBlocksTrCommit", () => {
    const path = blocksManager.getBlockPath(mainRootBlockId.value);
    mainRootBlockPath.value = path;
  });

  const ctx = {
    mainRootBlockId,
    mainRootBlockRef: readonly(mainRootBlockRef),
    mainRootBlockPath: readonly(mainRootBlockPath),
  };
  globalThis.getMainTreeContext = () => ctx;
  return ctx;
});

export default MainTreeContext;
