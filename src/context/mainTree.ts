import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";

const MainTreeContext = createContext(() => {
  const mainRootBlockId = useLocalStorage("mainRootBlockId", "root");

  const ctx = { mainRootBlockId };
  return ctx;
});

export default MainTreeContext;
