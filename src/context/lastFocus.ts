import { createContext } from "@/utils/createContext";
import type { DisplayItemId } from "@/utils/display-item";
import { shallowRef } from "vue";
import { type BlockTree } from "./blockTree";

const LastFocusContext = createContext(() => {
  const lastFocusedDiId = shallowRef<DisplayItemId | null>(null);
  const lastFocusedBlockTree = shallowRef<BlockTree | null>(null);

  const ctx = {
    lastFocusedDiId,
    lastFocusedBlockTree,
  };
  return ctx;
});

export default LastFocusContext;
