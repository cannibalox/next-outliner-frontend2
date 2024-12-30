import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import { ref } from "vue";
import type { BlockTreeId } from "./blockTree";

export type DraggingDropPos = {
  blockId: BlockId;
  relIndent: number;
  absLevel: number;
};

const BlockSelectDragContext = createContext(() => {
  const selectedBlockIds = ref<{
    topLevelOnly: BlockId[];
    allNonFolded: BlockId[];
  }>({ topLevelOnly: [], allNonFolded: [] });
  const draggingDropPos = ref<DraggingDropPos | null>(null);

  const ctx = { selectedBlockIds, draggingDropPos };
  globalThis.getBlockSelectContext = () => ctx;
  return ctx;
});

export default BlockSelectDragContext;
