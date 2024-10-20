<template>
  <template v-if="'itemComp' in item">
    <component :is="item.itemComp" />
  </template>
  <template v-else>
    <component :is="item.icon" class="size-4 stroke-[1.8] mr-3"></component>
    <template v-if="!iconOnly">{{ item.label }}</template>
  </template>
</template>

<script setup lang="ts">
import type { MoreOptionsItem } from ".";

const props = defineProps<{ item: MoreOptionsItem; iconOnly?: boolean }>();
</script>
