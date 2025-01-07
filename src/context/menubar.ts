import { createContext } from "@/utils/createContext";
import { ref } from "vue";

const MenubarContext = createContext(() => {
  const menuPaneOpen = ref(false);

  const ctx = { menuPaneOpen };
  return ctx;
});

export default MenubarContext;
