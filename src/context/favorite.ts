import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import useLocalStorage2 from "@/utils/useLocalStorage";
import { computed } from "vue";
import BlocksContext from "./blocks/blocks";
import type { Block } from "./blocks/view-layer/blocksManager";
import ServerInfoContext from "./serverInfo";
const FavoriteContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;
  const { kbPrefix } = ServerInfoContext.useContext()!;

  const favoriteBlockIdsId = "favorite.blockIds";
  const favoriteBlockIdsKey = computed(() => `${kbPrefix.value}${favoriteBlockIdsId}`);
  const favoriteBlockIds = useLocalStorage2(favoriteBlockIdsKey, []);
  const favoriteBlocks = computed({
    get: () => {
      return (favoriteBlockIds.value as BlockId[])
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
