import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import BlocksContext from "./blocks/blocks";
import type { Block } from "./blocks/view-layer/blocksManager";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { watch } from "vue";

export const SidebarContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;

  const sidePaneOpen = useLocalStorage("sidePaneOpen", false);
  const sidePaneDir = useLocalStorage("sidePaneDir", "right");
  const sidePaneWidth = useLocalStorage("sidePaneWidth", 500);
  const sidePaneHeight = useLocalStorage("sidePaneHeight", 300);
  const enableSidePaneAnimation = ref(true);
  const sidePaneBlockIds = useLocalStorage("sidePaneBlockIds", <BlockId[]>[]);
  const sidePaneCurrentBlockId = useLocalStorage("sidePaneCurrentBlockId", "");
  const dir = ref("left");

  const sidePaneBlocks = computed(() => {
    return sidePaneBlockIds.value
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
