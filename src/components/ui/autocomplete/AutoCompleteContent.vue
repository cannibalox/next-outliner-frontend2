<template>
  <PopoverContent
    v-bind="forwarded"
    :class="cn('pl-2 pr-1 py-2', props.class)"
    sticky="always"
    :style="{ width: 'var(--radix-popover-trigger-width)' }"
  >
    <div ref="elRef" class="overflow-y-auto max-h-[50vh] pr-1">
      <slot />
    </div>
  </PopoverContent>
</template>

<script setup lang="ts">
import { PopoverContent } from "../popover";
import { inject, onMounted, ref, watch, computed, type HTMLAttributes } from "vue";
import { useForwardProps } from "radix-vue";
import { cn } from "@/lib/utils";

const elRef = ref<HTMLDivElement | null>(null);
const context = inject<any>("context");

const props = defineProps<{ class?: HTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);

onMounted(() => {
  context.value.getContentEl = () => elRef.value;
});
</script>
