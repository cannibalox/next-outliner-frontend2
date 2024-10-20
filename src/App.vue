<template>
  <div v-if="!loaded" class="fixed size-full flex flex-col items-center justify-center space-y-3">
    <Skeleton class="h-[125px] w-[250px] rounded-xl" />
    <div class="space-y-2">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
    </div>
  </div>
  <TooltipProvider v-else>
    <HeaderBar />
    <ScrollArea class="rest-container">
      <BlockTree
        v-if="rootBlockRef?.value"
        id="main"
        :virtual="true"
        :root-block-ids="[rootBlockRef.value.id]"
        :root-block-level="0"
        :padding-top="36"
      ></BlockTree>
    </ScrollArea>
    <FloatingMathInput />
  </TooltipProvider>
</template>

<script setup lang="ts">
import BlockTree from "./components/BlockTree.vue";
import HeaderBar from "./components/header-bar/HeaderBar.vue";
import TooltipProvider from "./components/ui/tooltip/TooltipProvider.vue";
import ScrollArea from "./components/ui/scroll-area/ScrollArea.vue";
import FloatingMathInput from "./components/FloatingMathInput.vue";
import { globalEnv, loaded } from "./main";
import { Skeleton } from "@/components/ui/skeleton";
import { computed } from "vue";

const rootBlockRef = computed(() => {
  if (loaded.value) {
    return globalEnv.blocksManager.getRootBlockRef();
  }
  return null;
});
</script>

<style lang="scss">
.rest-container {
  margin-top: var(--headerbar-height);
  height: calc(100vh - var(--headerbar-height));
  overflow: hidden;
  max-width: calc(100% - var(--content-margin));
  margin-left: var(--content-margin);
  padding-right: var(--content-margin); // 使用 padding 而不是 margin，保证滚动条始终在右边缘
}
</style>
