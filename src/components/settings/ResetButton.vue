<template>
  <Tooltip>
    <TooltipTrigger>
      <Button variant="ghost" size="icon" @click="item.value.value = item.defaultValue">
        <RefreshCcw class="size-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ $t("kbView.settingsPanel.reset") }}</TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import type { SettingItem } from "@/context/settings";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Button } from "../ui/button";
import { RefreshCcw } from "lucide-vue-next";

const props = defineProps<{
  item: SettingItem<any>;
}>();
</script>
