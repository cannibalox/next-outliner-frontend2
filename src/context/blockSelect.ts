import type { BlockId } from "@/common/types";
import { createContext } from "@/utils/createContext";
import { ref } from "vue";
import type { BlockTreeId } from "./blockTree";

const BlockSelectContext = createContext(() => {
  const selectedBlockIds = ref<BlockId[]>([]);
  const selectedBlockTree = ref<BlockTreeId | null>(null);

  const ctx = { selectedBlockIds, selectedBlockTree };
  globalThis.getBlockSelectContext = () => ctx;
  return ctx;
});

export default BlockSelectContext;
