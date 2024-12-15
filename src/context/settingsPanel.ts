import { createContext } from "@/utils/createContext";
import { ref } from "vue";
import SettingsContext from "./settings";

const SettingsPanelContext = createContext(() => {
  const settingsContext = SettingsContext.useContext();
  const open = ref(false);
  const fstKey = Object.keys(settingsContext.settingGroups.value)[0];
  const activeGroupKey = ref(fstKey);

  const ctx = {
    open,
    activeGroupKey,
  };
  globalThis.getSettingsPanelContext = () => ctx;
  return ctx;
});

export default SettingsPanelContext;
