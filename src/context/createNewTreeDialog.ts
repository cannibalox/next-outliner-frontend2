import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export type CreateNewTreeDialogStatus = "waiting" | "creating" | "done" | "failed";

const createCreateNewTreeDialogContext = createContext(() => {
  const open = ref(false);
  const status = ref<CreateNewTreeDialogStatus>("waiting");

  const openCreateNewTreeDialog = () => {
    open.value = true;
    status.value = "waiting";
  };

  const closeCreateNewTreeDialog = () => {
    open.value = false;
    status.value = "waiting";
  };

  const ctx = {
    open,
    status,
    openCreateNewTreeDialog,
    closeCreateNewTreeDialog,
  };
  globalThis.getCreateNewTreeDialogContext = () => ctx;
  return ctx;
});

export default createCreateNewTreeDialogContext;
