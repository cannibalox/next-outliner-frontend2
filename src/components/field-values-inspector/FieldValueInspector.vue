<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {{ $t("kbView.fieldValuesInspector.title") }}
        </DialogTitle>
        <DialogDescription>
          {{ $t("kbView.fieldValuesInspector.description") }}
        </DialogDescription>
        <pre>{{ JSON.stringify(fieldValues, null, 2) }}</pre>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { computed } from "vue";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import FieldValueInspectorContext from "@/context/fieldValueInspector";

const { open, blockId } = FieldValueInspectorContext.useContext();
const fieldValues = computed(() => {
  const { getFieldValues } = getFieldsManagerContext()!;
  if (!blockId.value) return {};
  return getFieldValues(blockId.value);
});
</script>
