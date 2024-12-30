<template>
  <BasicBlockItem
    v-bind="$props"
    item-type="potential-links-descendant"
    :fold="fold"
    :handle-click-fold-button="handleClickFoldButton"
  />
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    block: Block;
    level: number;
    readonly?: boolean;
    highlightTerms?: string[];
    highlightRefs?: BlockId[];
  }>(),
  {
    blockTree: undefined,
    readonly: false,
    highlightTerms: () => [],
    highlightRefs: () => [],
  },
);

const fold = computed(() => {
  const tree = props.blockTree;
  if (!tree) return props.block.fold;
  const expandedBPBlockIds = tree.getExpandedBPBlockIds();
  if (expandedBPBlockIds[props.block.id]) return false;
  return props.block.fold;
});

const handleClickFoldButton = () => {
  const tree = props.blockTree;
  if (!tree) return;
  const expandedBPBlockIds = tree.getExpandedBPBlockIds();
  if (expandedBPBlockIds[props.block.id]) {
    tree.removeFromExpandedBPBlockIds(props.block.id);
  } else {
    tree.addToExpandedBPBlockIds(props.block.id);
  }
};
</script>
