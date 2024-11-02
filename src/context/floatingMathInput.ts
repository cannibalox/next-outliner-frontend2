import { createContext } from "@/utils/createContext";
import { ref, type Ref } from "vue";

type OpenFloatingMathInput = (
  mathEl: HTMLElement,
  initValue: string,
  // 当输入框内容变化时调用
  onChange: (value: string) => void,
  // 当从左侧跳出输入框时调用
  onSkipLeft: () => void,
  // 当从右侧跳出输入框时调用
  onSkipRight: () => void,
  // 当直接关闭输入框时调用
  onDirectClose: () => void,
  // 当删除当前节点时调用
  onDeleteThisNode: () => void,
) => void;

const FloatingMathInputContext = createContext(() => {
  const _openFloatingMathInput: Ref<OpenFloatingMathInput | null> = ref(null);

  const registerFloatingMathInput = (open: OpenFloatingMathInput) => {
    _openFloatingMathInput.value = open;
  };

  const openFloatingMathInput = (...params: Parameters<OpenFloatingMathInput>) => {
    _openFloatingMathInput.value?.(...params);
  };

  const ctx = {
    registerFloatingMathInput,
    openFloatingMathInput,
  };
  // 通过 globalThis 暴露给组件外使用
  globalThis.getFloatingMathInputContext = () => ctx;
  return ctx;
});

export default FloatingMathInputContext;
