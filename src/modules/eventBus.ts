import { defineModule } from "@/common/module";
import { useDebounceFn } from "@vueuse/core";
import mitt from "mitt";
import { ref, type Ref } from "vue";
import type { BlockTransaction } from "./blocksManager";

type Events = {
  // 当 blockTransaction 提交后触发
  afterBlocksTrCommit: BlockTransaction;
}

const EVENTS: (keyof Events)[] = ["afterBlocksTrCommit"] as const;

/**
 * 全局事件总线
 */
export const eventBus = defineModule("eventBus", {}, () => {
  const _mittInstance = mitt<Events>();

  // 用于将事件转换为 ref
  // 比如一次事件触发后，就将对应 ref 的值设置为参数
  // 这样只要 watch 事件对应的 ref，就能监听到事件的触发，并拿到最新的事件参数
  const eventRefs = EVENTS.reduce((acc, key) => {
    acc[key] = ref(null);
    return acc;
  }, {} as { [key in keyof Events]: Ref<Events[key] | null> });

  for (const key of EVENTS) {
    _mittInstance.on(key, (...args) => {
      eventRefs[key].value = args as any;
    });
  }
  
  return {
    on: _mittInstance.on,
    off: _mittInstance.off,
    emit: _mittInstance.emit,
    eventRefs,
  };
});
