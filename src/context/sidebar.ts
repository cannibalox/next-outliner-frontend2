import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import useLocalStorage2 from "@/utils/useLocalStorage";
import { computed, ref, watch } from "vue";
import BlocksContext from "./blocks/blocks";
import type { Block } from "./blocks/view-layer/blocksManager";
import ServerInfoContext from "./serverInfo";

export const SidebarContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;
  const { kbPrefix } = ServerInfoContext.useContext()!;

  const localStorageIds = {
    sidePaneOpen: "sidePaneOpen",
    sidePaneDir: "sidePaneDir",
    sidePaneWidth: "sidePaneWidth",
    sidePaneHeight: "sidePaneHeight",
    sidePaneBlockIds: "sidePaneBlockIds",
    sidePaneCurrentBlockId: "sidePaneCurrentBlockId",
  };

  const localStorageKeys = {
    sidePaneOpen: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneOpen}`),
    sidePaneDir: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneDir}`),
    sidePaneWidth: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneWidth}`),
    sidePaneHeight: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneHeight}`),
    sidePaneBlockIds: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneBlockIds}`),
    sidePaneCurrentBlockId: computed(
      () => `${kbPrefix.value}${localStorageIds.sidePaneCurrentBlockId}`,
    ),
  };

  const sidePaneOpen = useLocalStorage2(localStorageKeys.sidePaneOpen, false);
  const sidePaneDir = useLocalStorage2(localStorageKeys.sidePaneDir, "right");
  const sidePaneWidth = useLocalStorage2(localStorageKeys.sidePaneWidth, 500);
  const sidePaneHeight = useLocalStorage2(localStorageKeys.sidePaneHeight, 300);
  const enableSidePaneAnimation = ref(true);
  const sidePaneBlockIds = useLocalStorage2(localStorageKeys.sidePaneBlockIds, <BlockId[]>[]);
  const sidePaneCurrentBlockId = useLocalStorage2(localStorageKeys.sidePaneCurrentBlockId, "");
  const dir = ref("left");

  const sidePaneBlocks = computed(() => {
    return (sidePaneBlockIds.value as BlockId[])
      .map((id) => blocksManager.getBlock(id))
      .filter((b): b is Block => !!b);
  });

  const hasPrev = computed(() => {
    if (sidePaneCurrentBlockId.value == null) return false;
    const index = sidePaneBlockIds.value.indexOf(sidePaneCurrentBlockId.value);
    return index !== -1 && index > 0;
  });

  const hasNext = computed(() => {
    if (sidePaneCurrentBlockId.value == null) return false;
    const index = sidePaneBlockIds.value.indexOf(sidePaneCurrentBlockId.value);
    return index !== -1 && index < sidePaneBlockIds.value.length - 1;
  });

  const goPrev = () => {
    const index = sidePaneBlockIds.value.indexOf(sidePaneCurrentBlockId.value);
    if (index === -1) return;
    const nextIndex = index === 0 ? sidePaneBlockIds.value.length - 1 : index - 1;
    sidePaneCurrentBlockId.value = sidePaneBlockIds.value[nextIndex];
    dir.value = "left";
  };

  const goNext = () => {
    const index = sidePaneBlockIds.value.indexOf(sidePaneCurrentBlockId.value);
    if (index === -1) return;
    const nextIndex = index === sidePaneBlockIds.value.length - 1 ? 0 : index + 1;
    sidePaneCurrentBlockId.value = sidePaneBlockIds.value[nextIndex];
    dir.value = "right";
  };

  watch(
    [sidePaneBlockIds, sidePaneCurrentBlockId],
    () => {
      if (sidePaneCurrentBlockId.value == null) {
        if (sidePaneBlockIds.value.length > 0) {
          sidePaneCurrentBlockId.value = sidePaneBlockIds.value[0];
        }
      } else if (!sidePaneBlockIds.value.includes(sidePaneCurrentBlockId.value)) {
        if (sidePaneBlockIds.value.length > 0) {
          sidePaneCurrentBlockId.value = sidePaneBlockIds.value[0];
        } else {
          sidePaneCurrentBlockId.value = null;
        }
      }
    },
    { immediate: true },
  );

  return {
    sidePaneOpen,
    sidePaneDir,
    sidePaneWidth,
    sidePaneHeight,
    enableSidePaneAnimation,
    sidePaneBlockIds,
    sidePaneBlocks,
    sidePaneCurrentBlockId,
    hasPrev,
    hasNext,
    goPrev,
    goNext,
    dir,
  };
});

export default SidebarContext;
