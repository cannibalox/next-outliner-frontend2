import { defineComponent, inject, provide, reactive, readonly, type ComponentPropsOptions, type DefineComponent, type FunctionalComponent, type InjectionKey, type PropType, type SetupContext, type UnwrapRef, type VNode } from "vue";

// 返回类型
export interface CreateContext<T> {
  Provider: DefineComponent<{}, () => VNode | VNode[] | undefined, any>;
  injectionKey: InjectionKey<T>;
  useContext: (defaultValue?: T) => T;
}

export const createContext = <T extends object, P = {}>(
  getInitValue: (props: P) => T,
  injectionKey: InjectionKey<T> = Symbol(),
): CreateContext<T> => {

  const ContextProvider = defineComponent({
    name: 'ContextProvider',
    inheritAttrs: false,
    setup(props, { slots }: SetupContext) {
      const initValue = getInitValue(props as P) as T; // XXX
      // console.log(`provide ${injectionKey.toString()}, value=`, initValue);
      provide(injectionKey, initValue);
      return () => slots.default?.();
    },
  });

  const useContext = (defaultValue?: T) => {
    return inject(injectionKey, defaultValue || ({} as T));
  }

  return {
    injectionKey,
    useContext,
    Provider: ContextProvider,
  };
};