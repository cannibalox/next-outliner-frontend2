<template>
  <ContextMenu>
    <TooltipProvider>
      <Tooltip>
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" :disabled="goPrevDisabled" @click="goPrev">
              <ArrowLeft class="size-5" />
            </Button>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <TooltipContent>
          {{ $t("kbView.history.goToPrev") }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <ContextMenuContent> </ContextMenuContent>
  </ContextMenu>

  <ContextMenu>
    <TooltipProvider>
      <Tooltip>
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" :disabled="goNextDisabled" @click="goNext">
              <ArrowRight class="size-5" />
            </Button>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <TooltipContent>
          {{ $t("kbView.history.goToNext") }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <ContextMenuContent> </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight } from "lucide-vue-next";
import HistoryContext from "@/context/history";
import { computed } from "vue";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../ui/context-menu";

const { currentIndex, historyItems, goPrev, goNext } = HistoryContext.useContext()!;
const goPrevDisabled = computed(() => currentIndex.value <= 0);
const goNextDisabled = computed(() => currentIndex.value >= historyItems.value.length);
</script>
