<template>
  <BasicBlockItem
    v-bind="$props"
    data-item-type="backlink-block"
    :level="0"
    :highlight-refs="[...(highlightRefs ?? []), refBlockId]"
  />
</template>

<script setup lang="ts">
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";
import type { BlockId } from "@/common/types";

defineProps<{
  blockTree?: BlockTree;
  refBlockId: BlockId;
  block: Block;
  hideFoldButton?: boolean;
  hideBullet?: boolean;
  forceFold?: boolean;
  showPath?: boolean;
  readonly?: boolean;
  highlightTerms?: string[];
  highlightRefs?: BlockId[];
}>();
</script>
