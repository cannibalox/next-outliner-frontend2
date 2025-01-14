<template>
  <CodeMirror
    v-if="viewingAttachment"
    :lang="viewingAttachment.lang"
    v-model:src="viewingAttachment.tempContent"
    :readonly="!allowEdit"
  />
</template>

<script setup lang="ts">
import type { ViewingTextAttachment } from "@/context/attachmentViewer";
import CodeMirror from "../codemirror/CodeMirror.vue";

const props = defineProps<{
  allowEdit: boolean;
}>();

const viewingAttachment = defineModel<ViewingTextAttachment>("viewingAttachment");
</script>
