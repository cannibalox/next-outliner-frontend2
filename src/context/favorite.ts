import type { BlockId } from "@/common/types";
import { createContext } from "@/utils/createContext";
import { computed, ref } from "vue";
import BlocksContext from "./blocks-provider/blocks";
import type { Block } from "./blocks-provider/app-state-layer/blocksManager";
import { useLocalStorage } from "@vueuse/core";

const FavoriteContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext();

  const favoriteBlockIds = useLocalStorage<BlockId[]>("favoriteBlockIds", []);
  const favoriteBlocks = computed({
    get: () => {
      return favoriteBlockIds.value
        .map((id) => blocksManager.getBlock(id))
        .filter((b): b is Block => !!b);
    },
    set: (value) => {
      favoriteBlockIds.value = value.map((b) => b.id);
    },
  });

  return {
    favoriteBlockIds,
    favoriteBlocks,
  };
});

export default FavoriteContext;
