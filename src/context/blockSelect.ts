import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import type { DisplayItemId } from "@/utils/display-item";
import { ref } from "vue";

export type DraggingDropPos = {
  itemId: DisplayItemId;
  relIndent: number;
  absLevel: number;
};

const BlockSelectDragContext = createContext(() => {
  const selectedBlockIds = ref<{
    topLevelOnly: BlockId[];
    allNonFolded: BlockId[];
  }>({ topLevelOnly: [], allNonFolded: [] });
  const draggingDropPos = ref<DraggingDropPos | null>(null);
  const dragging = ref(false);

  const ctx = { selectedBlockIds, draggingDropPos, dragging };
  return ctx;
});

export default BlockSelectDragContext;
