import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export const PasteDialogContext = createContext(() => {
  const open = ref(false);
  const ctx = {
    open,
  };
  return ctx;
});

export default PasteDialogContext;
