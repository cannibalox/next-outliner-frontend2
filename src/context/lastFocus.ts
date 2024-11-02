import type { BlockId } from "@/common/types";
import { createContext } from "@/utils/createContext";
import { computed, ref } from "vue";
import { BlockTreeContext, type BlockTreeId } from "./blockTree";
import BlocksContext from "./blocks-provider/blocks";

const LastFocusContext = createContext(() => {
  const blockTreeContext = BlockTreeContext.useContext();
  const { blocksManager } = BlocksContext.useContext();
  const lastFocusedBlockId = ref<BlockId | null>(null);
  const lastFocusedBlockTreeId = ref<BlockTreeId | null>(null);
  
  const lastFocusedBlockTree = computed(() => {
    const treeId = lastFocusedBlockTreeId.value;
    if (!treeId) return null;
    return blockTreeContext.getBlockTree(treeId);
  });

  const lastFocusedBlock = computed(() => {
    const blockId = lastFocusedBlockId.value;
    if (!blockId) return null;
    return blocksManager.getBlockRef(blockId).value;
  });

  const lastFocusedEditorView = computed(() => {
    const treeId = lastFocusedBlockTreeId.value;
    if (!treeId) return null;
    const tree = blockTreeContext.getBlockTree(treeId);
    if (!tree) return null;
    const blockId = lastFocusedBlockId.value;
    if (!blockId) return null;
    return tree.getEditorView(blockId);
  });

  const ctx =  {
    lastFocusedBlockId,
    lastFocusedBlockTreeId,
    lastFocusedBlock,
    lastFocusedBlockTree,
    lastFocusedEditorView,
  };
  globalThis.getLastFocusContext = () => ctx;
  return ctx;
});

export default LastFocusContext;
