<template>
  <div class="flex items-center gap-2">
    <KeybindingInput class="my-2" v-model="item.value.value" />
    <ResetButton :item="item" />
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import ResetButton from "./ResetButton.vue";
import KeybindingInput from "../keybinding-input/KeybindingInput.vue";

const props = defineProps<{
  item: SettingItem<string, "keybindingInput">;
}>();
</script>
