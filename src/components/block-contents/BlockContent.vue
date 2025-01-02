<template>
  <TextContent
    v-if="block.content[0] === BLOCK_CONTENT_TYPES.TEXT"
    :block="block"
    :block-tree="blockTree"
    :readonly="readonly"
    :highlight-terms="highlightTerms"
    :highlight-refs="highlightRefs"
  ></TextContent>
  <MathContent
    v-else-if="block.content[0] === BLOCK_CONTENT_TYPES.MATH"
    :block="block"
    :block-tree="blockTree"
    :readonly="readonly"
  ></MathContent>
  <CodeContent
    v-else-if="block.content[0] === BLOCK_CONTENT_TYPES.CODE"
    :block="block"
    :block-tree="blockTree"
    :readonly="readonly"
  ></CodeContent>
  <ImageContent
    v-else-if="block.content[0] === BLOCK_CONTENT_TYPES.IMAGE"
    :block="block"
    :block-tree="blockTree"
  ></ImageContent>
</template>

<script setup lang="ts">
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { BlockTree } from "@/context/blockTree";
import CodeContent from "../block-contents/CodeContent.vue";
import ImageContent from "../block-contents/ImageContent.vue";
import MathContent from "@/components/block-contents/MathContent.vue";
import TextContent from "@/components/block-contents/TextContent.vue";
import type { Block } from "@/context/blocks/view-layer/blocksManager";

defineProps<{
  block: Block;
  blockTree?: BlockTree;
  readonly?: boolean;
  highlightTerms?: string[];
  highlightRefs?: BlockId[];
}>();
</script>
