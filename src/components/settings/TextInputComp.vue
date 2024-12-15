<template>
  <div>
    <div class="flex items-center gap-2">
      <Input v-model="item.value.value" />
      <ResetButton :item="item" />
    </div>
    <div v-if="validationMsg" class="text-red-500 text-sm mt-2">
      {{ validationMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SettingItem, SettingComponentType } from "@/context/settings";
import { computed } from "vue";
import { Input } from "../ui/input";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  item: SettingItem<string, "textInput">;
}>();

const validationMsg = computed(() => {
  const validator = props.item.componentType.validator;
  if (!validator) return undefined;
  return validator(props.item.value.value);
});
</script>
