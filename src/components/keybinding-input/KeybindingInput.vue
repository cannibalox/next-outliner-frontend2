<template>
  <Button
    variant="outline"
    size="sm"
    class="font-normal focus:bg-muted"
    @keydown.prevent="keydownHandler"
    @click.prevent
  >
    <template v-if="value">
      {{ value }}
      <X class="ml-2 size-4" />
    </template>
    <template v-else>
      <span class="italic text-muted-foreground">{{ $t("kbView.keybindingInput.empty") }}</span>
      <Plus class="ml-2 size-4" />
    </template>
  </Button>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-vue-next";

const value = defineModel<string>();

const keydownHandler = (e: KeyboardEvent) => {
  const result = <string[]>[];
  if (e.metaKey || e.ctrlKey) result.push("Mod");
  if (e.altKey) result.push("Alt");
  if (e.shiftKey) result.push("Shift");
  result.push(e.key);
  value.value = result.join("-");
};
</script>
