<template>
  <Input
    v-model="modelValue"
    @focus="context.showSuggestions = true"
    @blur="context.showSuggestions = false"
    @keydown="keydownHandler"
    :class="cn('', props.class)"
  />
</template>

<script setup lang="ts">
import { generateKeydownHandlerSimple } from "@/context/keymap";
import { Input } from "../input";
import { inject, ref, computed, type HTMLAttributes, onMounted } from "vue";
import { useThrottleFn, useVModel } from "@vueuse/core";
import { useForwardProps } from "radix-vue";
import { cn } from "@/lib/utils";

const context = inject<any>("context");

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: HTMLAttributes["class"];
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});

// 注册 emitInputValue 方法
// 让 AutoComplete 组件可以修改 modelValue
onMounted(() => {
  context.value.emitInputValue = (payload: string | number) => {
    emits("update:modelValue", payload);
  };
});

const keydownHandler = generateKeydownHandlerSimple({
  ArrowDown: {
    run: useThrottleFn((e) => {
      if (e.isComposing || e.keyCode === 229) return false;
      const contentEl = context.value.getContentEl();
      const itemEls = contentEl?.querySelectorAll(".AutoCompleteSuggestionItem");
      if (!itemEls) return false;
      const currIndex = [...itemEls].findIndex(
        (el) => el instanceof HTMLElement && el.dataset.focus === "true",
      );
      if (currIndex === -1) return false;
      const nextIndex = currIndex === itemEls.length - 1 ? 0 : currIndex + 1;
      context.value.focusItemEl = itemEls[nextIndex];
      context.value.suppressMouseover = true;
      itemEls[nextIndex].scrollIntoView({ block: "nearest" });
      setTimeout(() => {
        context.value.suppressMouseover = false;
      }, 100);
      return true;
    }, 100) as any,
  },
  ArrowUp: {
    run: useThrottleFn((e) => {
      if (e.isComposing || e.keyCode === 229) return false;
      const contentEl = context.value.getContentEl();
      const itemEls = contentEl?.querySelectorAll(".AutoCompleteSuggestionItem");
      if (!itemEls) return false;
      const currIndex = [...itemEls].findIndex(
        (el) => el instanceof HTMLElement && el.dataset.focus === "true",
      );
      if (currIndex === -1) return false;
      const prevIndex = currIndex === 0 ? itemEls.length - 1 : currIndex - 1;
      context.value.focusItemEl = itemEls[prevIndex];
      context.value.suppressMouseover = true;
      itemEls[prevIndex].scrollIntoView({ block: "nearest" });
      setTimeout(() => {
        context.value.suppressMouseover = false;
      }, 100);
      return true;
    }, 100) as any,
  },
  Enter: {
    run: (e) => {
      if (e.isComposing || e.keyCode === 229) return false;
      const focusItemEl = context.value.focusItemEl;
      const itemEls = context.value.itemEls;
      if (!focusItemEl) return false;
      const value = itemEls.get(focusItemEl);
      if (context.value.onSelectItem) {
        context.value.onSelectItem(value);
      } else {
        emits("update:modelValue", value);
      }
      return true;
    },
  },
});
</script>
