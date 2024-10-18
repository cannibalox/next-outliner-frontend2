import { defineModule } from "@/common/module";
import { computed, ref } from "vue";
import { blockTreeRegistry, type BlockTreeId } from "./blockTreeRegistry";
import type { BlockId } from "@/common/types";
import { blocksManager } from "./blocksManager";

export const globalUiVars = defineModule("globalUiVars", {blocksManager, blockTreeRegistry}, ({blocksManager, blockTreeRegistry}) => {
  const lastFocusedBlockId = ref<BlockId | null>(null);
  const lastFocusedBlockTreeId = ref<BlockTreeId | null>(null);

  const lastFocusedBlockTree = computed(() => {
    const treeId = lastFocusedBlockTreeId.value;
    if (!treeId) return null;
    return blockTreeRegistry.getBlockTree(treeId);
  });

  const lastFocusedBlock = computed(() => {
    const blockId = lastFocusedBlockId.value;
    if (!blockId) return null;
    return blocksManager.getBlockRef(blockId).value;
  });

  const lastFocusedEditorView = computed(() => {
    const treeId = lastFocusedBlockTreeId.value;
    if (!treeId) return null;
    const tree = blockTreeRegistry.getBlockTree(treeId);
    if (!tree) return null;
    const blockId = lastFocusedBlockId.value;
    if (!blockId) return null;
    return tree.getEditorView(blockId);
  });

  return {
    lastFocusedBlockId,
    lastFocusedBlockTreeId,
    lastFocusedBlockTree,
    lastFocusedBlock,
    lastFocusedEditorView,
  };
});
