import { createContext } from "@/utils/createContext";
import SettingsContext from "./settings";
import { useLocalStorage } from "@vueuse/core";
import useWritableComputedRef from "@/utils/useWritableComputedRef";

const BasicSettingsContext = createContext(() => {
  const { registerSettingGroup, registerSettingItem } = SettingsContext.useContext();

  registerSettingGroup({
    key: "basic",
    label: {
      zh: "基本设置",
    },
  });

  const blockIdValidator = (value: string) => {
    const { blocksManager } = globalThis.getBlocksContext() ?? {};
    if (!blocksManager) return undefined;
    const block = blocksManager.getBlock(value);
    return block ? undefined : "无效的块 ID";
  };

  const showBacklinksCounterKey = "basic.showBacklinksCounter";
  const showBacklinksCounterDefaultValue = true;
  const showBacklinksCounter = useLocalStorage(
    showBacklinksCounterKey,
    showBacklinksCounterDefaultValue,
  );
  registerSettingItem({
    id: showBacklinksCounterKey,
    groupKey: "basic",
    label: {
      zh: "是否在块右侧显示引用计数",
    },
    desc: {
      zh: "启用后，如果一个块有被其他块引用，则会在这个块右侧显示引用计数，点击计数会弹出一个浮窗以查看所有引用。",
    },
    defaultValue: showBacklinksCounterDefaultValue,
    value: useWritableComputedRef(showBacklinksCounter),
    componentType: {
      type: "switch",
    },
  });

  const aliasBlockIdKey = "basic.aliasBlockId";
  const aliasBlockIdDefaultValue = "";
  const aliasBlockId = useLocalStorage(aliasBlockIdKey, aliasBlockIdDefaultValue);
  registerSettingItem({
    id: aliasBlockIdKey,
    groupKey: "basic",
    label: {
      zh: "别名块 ID",
    },
    desc: {
      zh: "指定别名块 ID。别名块用于指定块的别名，用法如下:\n- 一个块\n    - {{别名块引用}}\n        - 别名 1\n        - 别名 2",
    },
    defaultValue: aliasBlockIdDefaultValue,
    value: useWritableComputedRef(aliasBlockId),
    componentType: {
      type: "textInput",
      validator: blockIdValidator,
    },
  });

  const ctx = {
    aliasBlockId,
  };
  globalThis.getBasicSettingsContext = () => ctx;
  return ctx;
});

export default BasicSettingsContext;
