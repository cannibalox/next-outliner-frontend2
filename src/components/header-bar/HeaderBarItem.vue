<template>
  <template v-if="'itemComp' in item">
    <component :is="item.itemComp" />
  </template>
  <div v-else class="flex items-center">
    <component
      :is="item.icon"
      class="size-5 stroke-[1.8]"
      :class="iconClass + ` ${!iconOnly ? 'mr-3' : ''}`"
    ></component>
    <template v-if="!iconOnly">
      <component :is="item.label" :class="labelClass" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { HeaderBarItemType } from ".";

defineProps<{
  item: HeaderBarItemType;
  iconOnly?: boolean;
  iconClass?: string;
  labelClass?: string;
}>();
</script>
