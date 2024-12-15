<template>
  <div class="relative">
    <CodeMirror
      class="border rounded-md min-h-[100px] p-2 cursor-text"
      v-model:src="item.value.value"
      lang="json"
    ></CodeMirror>
    <div v-if="parseResult && !parseResult.success" class="text-red-500 text-sm mt-2">
      {{ $t("kbView.settingsPanel.invalidJson") }}
    </div>
    <div class="absolute right-0 top-0 m-2">
      <ResetButton :item="item" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import ResetButton from "./ResetButton.vue";
import CodeMirror from "../codemirror/CodeMirror.vue";
import { computed } from "vue";

const props = defineProps<{
  item: SettingItem<string, "json">;
}>();

const parseResult = computed(() => {
  const schema = props.item.componentType.schema;
  if (!schema) return undefined;
  return schema.safeParse(props.item.value.value);
});
</script>
