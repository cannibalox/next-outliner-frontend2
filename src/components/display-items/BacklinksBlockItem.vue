<template>
  <BasicBlockItem
    v-bind="$props"
    item-type="backlink-block"
    :level="0"
    :highlight-refs="[...highlightRefs, refBlockId]"
    :fold="fold"
    :item-id="itemId"
    :handle-click-fold-button="handleClickFoldButton"
  />
</template>

<script setup lang="ts">
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { computed } from "vue";
import type { DisplayItemId } from "@/utils/display-item";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    refBlockId: BlockId;
    itemId?: DisplayItemId;
    block: Block;
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
  return true; // 反链面板里根块默认是折叠的，不管 props.block.fold 的值是怎么样
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
