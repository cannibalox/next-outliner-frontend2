<script setup lang="ts">
import type { FunctionalComponent, HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Primitive, type PrimitiveProps } from "radix-vue";
import { type ButtonVariants, buttonVariants } from ".";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
  tooltip?: string | FunctionalComponent;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
});
</script>

<template>
  <!-- with tooltip -->
  <Tooltip v-if="tooltip">
    <TooltipTrigger as-child>
      <Primitive
        :as="as"
        :as-child="asChild"
        :class="cn(buttonVariants({ variant, size }), props.class)"
      >
        <slot />
      </Primitive>
    </TooltipTrigger>
    <TooltipContent>
      <template v-if="typeof tooltip === 'string'"> {{ tooltip }} </template>
      <component v-else :is="tooltip" />
    </TooltipContent>
  </Tooltip>

  <!-- no tooltip -->
  <Primitive
    v-else
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
