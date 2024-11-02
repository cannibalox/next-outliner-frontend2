import { createContext } from "@/utils/createContext";
import { ref, type Ref } from "vue";

type FusionCommand = {
  open: (query: string) => void;
};

export const FusionCommandContext = createContext(() => {
  const _fusionCommand: Ref<FusionCommand | null> = ref(null);

  const registerFusionCommand = (inst: FusionCommand) => {
    _fusionCommand.value = inst;
  };

  const openFusionCommand = (query: string) => {
    _fusionCommand.value?.open(query);
  };

  return {
    registerFusionCommand,
    openFusionCommand,
  };
});

export default FusionCommandContext;
