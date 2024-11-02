import { createContext } from "@/utils/createContext";
import { readonly, shallowReactive, type FunctionalComponent, type Reactive } from "vue";

type ContextualCommand = {
  key: string;
  icon?: FunctionalComponent;
  label: FunctionalComponent;
  // test === true => 测试模式，不执行实际操作
  // 返回值：是否成功执行
  run: (test?: boolean) => boolean;
}

export const ContextualCommandsContext = createContext(() => {
  // XXX, avoid ts error
  const commands = shallowReactive({}) as Reactive<Record<string, ContextualCommand>>;

  const registerCommand = (command: ContextualCommand) => {
    commands[command.key] = command;
  };

  const unregisterCommand = (key: string) => {
    delete commands[key];
  };

  return {
    commands: readonly(commands),
    registerCommand,
    unregisterCommand,
  }
});