import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";
import { ref } from "vue";

export const SidebarContext = createContext(() => {
  const menuPaneOpen = useLocalStorage("menuPaneOpen", false);
  const sidePaneOpen = useLocalStorage("sidePaneOpen", false);
  const sidePaneDir = useLocalStorage("sidePaneDir", "right");
  const sidePaneWidth = useLocalStorage("sidePaneWidth", 500);
  const sidePaneHeight = useLocalStorage("sidePaneHeight", 300);
  const enableSidePaneAnimation = ref(true);

  return {
    menuPaneOpen,
    sidePaneOpen,
    sidePaneDir,
    sidePaneWidth,
    sidePaneHeight,
    enableSidePaneAnimation,
  };
});

export default SidebarContext;
