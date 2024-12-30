<template>
  <div
    v-bind="forwarded"
    ref="elRef"
    @mouseover="() => !context.suppressMouseover && (context.focusItemEl = elRef)"
    :data-focus="context.focusItemEl === elRef"
    tabindex="-1"
    :class="
      cn(
        'AutoCompleteSuggestionItem flex cursor-default outline-none text-sm transition-colors select-none items-center data-[focus=true]:bg-accent data-[focus=true]:text-accent-foreground rounded-sm px-2 py-1.5',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, computed, type HTMLAttributes } from "vue";
import { useForwardProps } from "radix-vue";
import { cn } from "@/lib/utils";

const context = inject<any>("context");
const elRef = ref<HTMLDivElement | null>(null);

const props = defineProps<{
  value: string | number;
  class?: HTMLAttributes["class"];
}>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);

// 向 AutoComplete 组件注册自己
onMounted(() => {
  const el = elRef.value;
  if (!el) return;
  context.value.itemEls.set(el, props.value);
});

// 从 AutoComplete 组件注销自己
onBeforeUnmount(() => {
  const el = elRef.value;
  if (!el) return;
  context.value.itemEls.delete(el);
});
</script>
