import { createContext } from "@/utils/createContext";
import useLocalStorage2 from "@/utils/useLocalStorage";
import { computed } from "vue";
import ServerInfoContext from "./serverInfo";

const MainTreeContext = createContext(() => {
  const { kbPrefix } = ServerInfoContext.useContext()!;
  const mainRootBlockIdId = "main.rootBlockId";
  const mainRootBlockIdKey = computed(() => `${kbPrefix.value}${mainRootBlockIdId}`);
  const mainRootBlockId = useLocalStorage2(mainRootBlockIdKey, "root");

  const ctx = { mainRootBlockId };
  return ctx;
});

export default MainTreeContext;
