<template>
  <BasicBlockItem
    v-bind="$props"
    item-type="backlink-descendant"
    :fold="fold"
    :item-id="itemId"
    :handle-click-fold-button="handleClickFoldButton"
  />
</template>

<script setup lang="ts">
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import { computed } from "vue";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { DisplayItemId } from "@/utils/display-item";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    block: Block;
    level: number;
    itemId?: DisplayItemId;
    readonly?: boolean;
    highlightTerms?: string[];
    highlightRefs?: BlockId[];
  }>(),
  {
    blockTree: undefined,
    readonly: false,
    itemId: undefined,
    highlightTerms: () => [],
    highlightRefs: () => [],
  },
);

const fold = computed(() => {
  const tree = props.blockTree;
  if (!tree) return props.block.fold;
  const expandedBP = tree.expandedBP.value;
  if (expandedBP[props.block.id]) return false;
  return props.block.fold;
});

const handleClickFoldButton = () => {
  const tree = props.blockTree;
  if (!tree) return;
  const expandedBP = tree.expandedBP.value;
  if (expandedBP[props.block.id]) {
    delete expandedBP[props.block.id];
  } else {
    expandedBP[props.block.id] = true;
  }
};
</script>
