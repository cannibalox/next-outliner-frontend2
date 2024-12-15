<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import { Switch } from "../ui/switch";
import ResetButton from "./ResetButton.vue";

defineProps<{
  item: SettingItem<boolean, "switch">;
}>();
</script>

<template>
  <div class="flex items-center gap-x-2 pt-2">
    <Switch v-model:checked="item.value.value"></Switch>
    <ResetButton :item="item" />
  </div>
</template>
