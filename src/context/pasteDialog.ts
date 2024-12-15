import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export const PasteDialogContext = createContext(() => {
  const open = ref(false);
  const status = ref<"waiting" | "pasting" | "done" | "failed">("waiting");
  const progress = ref("");
  const content = ref("");

  const showPasteDialog = (text: string) => {
    content.value = text;
    status.value = "waiting";
    progress.value = "";
    open.value = true;
  };

  const closePasteDialog = () => {
    open.value = false;
    content.value = "";
  };

  const ctx = {
    open,
    status,
    progress,
    content,
    showPasteDialog,
    closePasteDialog,
  };
  globalThis.getPasteDialogContext = () => ctx;
  return ctx;
});

export default PasteDialogContext;
