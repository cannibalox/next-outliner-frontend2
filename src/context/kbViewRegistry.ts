import { createContext } from "@/utils/createContext";

// 用于绕开循环依赖问题，尽可能少用！
const kbViewRegistry = createContext(() => {
  const _registry = {} as Record<string, any>;

  const register = (key: string, value: any) => {
    _registry[key] = value;
  };

  const get = <T>(key: string) => {
    return _registry[key] as T;
  };

  return { register, get };
});

export default kbViewRegistry;
