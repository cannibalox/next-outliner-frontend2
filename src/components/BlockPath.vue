<template>
  <Breadcrumb>
    <BreadcrumbList class="!gap-x-1 !gap-y-0">
      <template v-for="(block, index) in normalizedPath" :key="block.id">
        <BreadcrumbItem>
          <BreadcrumbLink
            class="no-underline cursor-pointer"
            @click="emit('click-path-segment', block.id)"
          >
            <BlockContent
              class="!max-w-[unset]"
              :block="block"
              :block-tree="undefined"
              :readonly="true"
            />
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index !== normalizedPath.length - 1"> / </BreadcrumbSeparator>
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/types";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import BlocksContext from "@/context/blocks-provider/blocks";
import { computed } from "vue";
import BlockContent from "./block-contents/BlockContent.vue";

const props = defineProps<{
  blockId: BlockId;
  includeSelf?: boolean;
}>();

const emit = defineEmits<{
  (e: "click-path-segment", blockId: BlockId): void;
}>();

const { blocksManager } = BlocksContext.useContext();

const normalizedPath = computed(() => {
  const path = [...blocksManager.getBlockPath(props.blockId)];
  path.reverse();
  if (!props.includeSelf) {
    path.pop();
  }
  return path;
});
</script>
