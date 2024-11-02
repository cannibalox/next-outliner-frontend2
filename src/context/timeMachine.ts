import { createContext } from "@/utils/createContext";
import { ref } from "vue";

export const TimeMachineContext = createContext(() => {
  const timeMachineOpen = ref(false);

  return {
    timeMachineOpen,
  };
});

export default TimeMachineContext;
