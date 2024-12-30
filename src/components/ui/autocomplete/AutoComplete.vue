<template>
  <Popover :open="context.showSuggestions" :data-width="context.width">
    <slot />
  </Popover>
</template>

<script setup lang="ts">
import { nextTick, onUpdated, provide, ref } from "vue";
import { Popover } from "../popover";
import { watch } from "vue";

const props = defineProps<{
  // 如果定义了 onSelectItem，则使用 onSelectItem 而不是 emits("update:modelValue")
  // 否则默认用 value 更新 modelValue
  onSelectItem?: (value: string | number) => void;
}>();

const context = ref<any>({
  showSuggestions: false,
  // 当前聚焦的 itemEl
  focusItemEl: undefined,
  // 注册的 itemEl 列表
  itemEls: new Map(),
  getContentEl: undefined,
  suppressMouseover: false,
  emitInputValue: undefined,
  onSelectItem: props.onSelectItem,
});
provide("context", context);

// 当 itemEls 发生变化时，将 focusItemEl 设置为第一个 itemEl
watch(
  () => context.value.itemEls,
  () => {
    const firstItemEl = context.value.itemEls.keys().next().value;
    if (!firstItemEl) return;
    context.value.focusItemEl = firstItemEl;
    firstItemEl.scrollIntoView({ block: "nearest" });
  },
  { deep: true },
);
</script>
