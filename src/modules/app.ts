import { YjsManager } from "@/yjs/YjsManager";
import { SettingsManager } from "./settings";
import { BackendApi } from "./backendApi";
import { BlocksManager } from "./blocks";

export type State<T> = {
  register: <N extends string, T2>(
    name: N,
    plugin: ExposedSth<T2>,
  ) => State<T & { [key in N]: T2 }>;
  init: (by: unknown) => Promise<void>;
} & T;

export type ExposedSth<T> = {
  getExposed: () => T;
};

export type InitBy<D> = {
  init: (by: D) => void | Promise<void>;
};

const createEmptyState = (): State<{}> => {
  return {
    register<N extends string, T2>(name, provider) {
      this[name] = provider.getExposed();
      if (provider.init) {
        const oldInit = this.init;
        this.init = async () => {
          await oldInit();
          await provider.init(this);
        };
      }
      return this;
    },
    async init() {},
  };
};

export const appState = createEmptyState()
  .register("settingsManager", new SettingsManager())
  .register("backendApi", new BackendApi())
  .register("yjsManager", new YjsManager())
  .register("blocksManager", new BlocksManager());
