<template>
  <PopoverAnchor v-bind="forwarded" :class="cn('', props.class)">
    <slot />
  </PopoverAnchor>
</template>

<script setup lang="ts">
import { PopoverAnchor } from "radix-vue";
import { computed, type HTMLAttributes } from "vue";
import { useForwardProps } from "radix-vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ asChild?: boolean; class?: HTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>
