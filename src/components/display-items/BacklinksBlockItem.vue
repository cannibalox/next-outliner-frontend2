<template>
  <BasicBlockItem
    v-bind="$props"
    item-type="backlink-block"
    :level="0"
    :highlight-refs="[...highlightRefs, refBlockId]"
    :fold="fold"
    :handle-click-fold-button="handleClickFoldButton"
  />
</template>

<script setup lang="ts">
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    refBlockId: BlockId;
    block: Block;
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
  return true; // 反链面板里根块默认是折叠的，不管 props.block.fold 的值是怎么样
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
