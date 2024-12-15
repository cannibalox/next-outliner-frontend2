<template>
  <div class="flex items-center gap-2">
    <Input
      v-model="item.value.value"
      type="number"
      :min="item.componentType.min"
      :max="item.componentType.max"
    />
    <ResetButton :item="item" />
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import ResetButton from "./ResetButton.vue";
import { Input } from "../ui/input";

defineProps<{
  item: SettingItem<number, "integerInput">;
}>();
</script>
