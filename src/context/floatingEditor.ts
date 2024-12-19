import { type BlockId } from "@/common/types";
import { createContext } from "@/utils/createContext";
import { computed, onMounted, onUnmounted, ref } from "vue";
import BasicSettingsContext from "./basicSettings";

const FloatingEditorContext = createContext(() => {
  const showPos = ref<{ x: number; y: number } | null>(null);
  const open = ref(false);
  const openedBlockId = ref<BlockId | null>(null);
  const { enableFloatingEditor } = BasicSettingsContext.useContext();

  const openFloatingEditor = (blockId: BlockId, pos: { x: number; y: number }) => {
    if (!enableFloatingEditor.value) return;
    openedBlockId.value = blockId;
    showPos.value = pos;
  };

  const closeFloatingEditor = () => {
    openedBlockId.value = null;
    showPos.value = null;
    open.value = false;
  };

  // 监听 ctrl 键按下和抬起
  const keydownHandler = (e: KeyboardEvent) => {
    if (e.ctrlKey && showPos.value) {
      open.value = true;
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", keydownHandler);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", keydownHandler);
  });

  const ctx = {
    showPos,
    open,
    openedBlockId,
    openFloatingEditor,
    closeFloatingEditor,
  };
  globalThis.getFloatingEditorContext = () => ctx;
  return ctx;
});

export default FloatingEditorContext;
