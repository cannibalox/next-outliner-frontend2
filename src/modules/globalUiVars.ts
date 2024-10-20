import { defineModule } from "@/common/module";
import { computed, ref, type Ref } from "vue";
import { blockTreeRegistry, type BlockTreeId } from "./blockTreeRegistry";
import type { BlockId } from "@/common/types";
import { blocksManager } from "./blocksManager";
import { useColorMode } from "@vueuse/core";

export const globalUiVars = defineModule(
  "globalUiVars",
  { blocksManager, blockTreeRegistry },
  ({ blocksManager, blockTreeRegistry }) => {
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

    const theme = useColorMode();

    const toggleTheme = () => {
      theme.value = theme.value === "dark" ? "light" : "dark";
    };


    type OpenFloatingMathInput = (
      mathEl: HTMLElement,
      initValue: string,
      // 当输入框内容变化时调用
      onChange: (value: string) => void,
      // 当从左侧跳出输入框时调用
      onSkipLeft: () => void,
      // 当从右侧跳出输入框时调用
      onSkipRight: () => void,
      // 当直接关闭输入框时调用
      onDirectClose: () => void,
      // 当删除当前节点时调用
      onDeleteThisNode: () => void,
    ) => void;

    const _openFloatingMathInput: Ref<OpenFloatingMathInput | null> = ref(null);

    const registerFloatingMathInput = (open: OpenFloatingMathInput) => {
      _openFloatingMathInput.value = open;
    };

    const openFloatingMathInput = (...params: Parameters<OpenFloatingMathInput>) => {
      _openFloatingMathInput.value?.(...params);
    };

    const focusModeNow = ref(false);

    return {
      lastFocusedBlockId,
      lastFocusedBlockTreeId,
      lastFocusedBlockTree,
      lastFocusedBlock,
      lastFocusedEditorView,
      theme,
      toggleTheme,
      registerFloatingMathInput,
      openFloatingMathInput,
      focusModeNow,
    };
  },
);
