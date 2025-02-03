<template>
  <BasicBlockItem
    v-bind="$props"
    class="root-block"
    item-type="root-block"
    :level="0"
    :highlight-refs="highlightRefs"
    :fold="false"
    :item-id="itemId"
    :hide-bullet="true"
    :hide-fold-button="true"
    :hide-context-menu="true"
    :can-expand="false"
  />
</template>

<script setup lang="ts">
import type { BlockTree } from "@/context/blockTree";
import BasicBlockItem from "./BasicBlockItem.vue";
import type { DisplayItemId } from "@/utils/display-item";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
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
</script>

<style lang="scss">
.root-block {
  padding-top: 30px;
  padding-bottom: 30px;

  .text-content .ProseMirror {
    font-size: 28px;
    font-weight: 500;
  }
}
</style>
