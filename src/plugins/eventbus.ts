import mitt, { type Emitter } from "mitt";
import { inject, ref, type App, type Ref } from "vue";
import type {
  BlockTransaction,
  TransactionEnvInfo,
} from "../context/blocks/view-layer/blocksManager";

type Events = {
  afterBlocksTrCommit: [tr: BlockTransaction];
  blocksDestroy: void;
};

const EVENTS: (keyof Events)[] = ["afterBlocksTrCommit", "blocksDestroy"] as const;

type EventRefs = { [key in keyof Events]: Ref<Events[key] | null> };

export const useEventBus = () => {
  const eventBus = inject<Emitter<Events>>("eventBus")!;
  const ctx = {
    emit: eventBus.emit,
    on: eventBus.on,
    off: eventBus.off,
    all: eventBus.all,
    eventRefs: inject<EventRefs>("eventRefs")!,
  };
  return ctx;
};

export const eventbusPlugin = {
  install: (app: App, options?: Record<string, unknown>) => {
    const _mittInstance = mitt<Events>();

    // 用于将事件转换为 ref
    // 比如一次事件触发后，就将对应 ref 的值设置为参数
    // 这样只要 watch 事件对应的 ref，就能监听到事件的触发，并拿到最新的事件参数
    const eventRefs = EVENTS.reduce((acc, key) => {
      acc[key] = ref(null);
      return acc;
    }, {} as EventRefs);

    for (const key of EVENTS) {
      _mittInstance.on(key, (...args) => {
        eventRefs[key].value = args as any;
      });
    }

    app.provide("eventBus", _mittInstance);
    app.provide("eventRefs", eventRefs);
  },
};
