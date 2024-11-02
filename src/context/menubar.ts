import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export const MenubarContext = createContext(() => {
  const menuPaneOpen = ref(false);

  return {
    menuPaneOpen,
  };
});

export default MenubarContext;
