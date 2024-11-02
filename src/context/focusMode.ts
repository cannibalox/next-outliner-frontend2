import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export const FocusModeContext = createContext(() => {
  const focusModeEnabled = ref(false);
  const focusNow = ref(false);

  return {
    focusModeEnabled,
    focusNow,
  };
});

export default FocusModeContext;
