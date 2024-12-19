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

  const textFontFamilyKey = "basic.textFontFamily";
  const textFontFamilyDefaultValue = "";
  const textFontFamily = useLocalStorage(textFontFamilyKey, textFontFamilyDefaultValue);
  registerSettingItem({
    id: textFontFamilyKey,
    groupKey: "basic",
    label: {
      zh: "正文字体",
    },
    desc: {
      zh: "指定笔记正文的字体。",
    },
    defaultValue: textFontFamilyDefaultValue,
    value: useWritableComputedRef(textFontFamily),
    componentType: {
      type: "fontSelector",
    },
  });

  const uiFontFamilyKey = "basic.uiFontFamily";
  const uiFontFamilyDefaultValue = "";
  const uiFontFamily = useLocalStorage(uiFontFamilyKey, uiFontFamilyDefaultValue);
  registerSettingItem({
    id: uiFontFamilyKey,
    groupKey: "basic",
    label: {
      zh: "界面字体",
    },
    desc: {
      zh: "指定软件界面字体。在不指定其他字体的情况下，该字体将成为软件的基础字体。",
    },
    defaultValue: uiFontFamilyDefaultValue,
    value: useWritableComputedRef(uiFontFamily),
    componentType: {
      type: "fontSelector",
    },
  });

  const monospaceFontFamilyKey = "basic.monospaceFontFamily";
  const monospaceFontFamilyDefaultValue = "";
  const monospaceFontFamily = useLocalStorage(
    monospaceFontFamilyKey,
    monospaceFontFamilyDefaultValue,
  );
  registerSettingItem({
    id: monospaceFontFamilyKey,
    groupKey: "basic",
    label: {
      zh: "代码块字体",
    },
    desc: {
      zh: "指定行内代码、代码块等需要等宽字体的场景使用的字体。",
    },
    defaultValue: monospaceFontFamilyDefaultValue,
    value: useWritableComputedRef(monospaceFontFamily),
    componentType: {
      type: "fontSelector",
    },
  });

  const enableFloatingEditorKey = "basic.enableFloatingEditor";
  const enableFloatingEditorDefaultValue = false;
  const enableFloatingEditor = useLocalStorage(
    enableFloatingEditorKey,
    enableFloatingEditorDefaultValue,
  );
  registerSettingItem({
    id: enableFloatingEditorKey,
    groupKey: "basic",
    label: {
      zh: "启用浮动编辑器",
    },
    desc: {
      zh: "启用后，在块引用块上按 Ctrl / Command 键时，会弹出浮动编辑器。",
    },
    defaultValue: enableFloatingEditorDefaultValue,
    value: useWritableComputedRef(enableFloatingEditor),
    componentType: {
      type: "switch",
    },
  });

  const ctx = {
    textFontFamily,
    uiFontFamily,
    monospaceFontFamily,
    enableFloatingEditor,
  };
  globalThis.getBasicSettingsContext = () => ctx;
  return ctx;
});

export default BasicSettingsContext;
