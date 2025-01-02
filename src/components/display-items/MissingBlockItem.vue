<template>
  <div
    class="missing-block-item block-item"
    :data-item-type="itemType"
    :data-block-id="blockId"
    :data-block-level="level"
    :class="{ selected, [itemType]: true }"
  >
    <div class="indent-lines">
      <div class="indent-line" v-for="i in level" :key="i" :data-level="i"></div>
    </div>
    <div class="relative block-content-container">
      <div class="block-buttons">
        <BlockContextMenu :block-id="blockId">
          <div class="more-button">
            <MoreHorizontal />
          </div>
        </BlockContextMenu>
      </div>

      <div class="bullet shrink-0">
        <Circle class="circle" />
      </div>

      <div class="text-red-500">Missing Block</div>
    </div>

    <!-- 拖拽时，显示拖拽指示线 -->
    <div
      v-if="draggingDropPos?.blockId === blockId"
      class="absolute bottom-[-2px] left-0 h-[2px] rounded w-[40%] bg-blue-500"
      :style="{ marginLeft: draggingDropPos.relIndent + 'px' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import BlocksContext from "@/context/blocks/blocks";
import BlockSelectDragContext from "@/context/blockSelect";
import type { BlockTree } from "@/context/blockTree";
import LastFocusContext from "@/context/lastFocus";
import MainTreeContext from "@/context/mainTree";
import { useTaskQueue } from "@/plugins/taskQueue";
import { Circle, Diamond, MoreHorizontal, Triangle } from "lucide-vue-next";
import { computed } from "vue";

import type { Block } from "@/context/blocks/view-layer/blocksManager";
import BlockContent from "../block-contents/BlockContent.vue";
import BlockContextMenu from "../contextmenu/BlockContextMenu.vue";
import IndexContext from "@/context";
import BacklinksCounter from "../backlinks-counter/BacklinksCounter.vue";
import type { DisplayItem } from "@/utils/display-item";

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    blockId: BlockId;
    level: number;
    hideBullet?: boolean;
    itemType?: DisplayItem["type"];
  }>(),
  {
    blockTree: undefined,
    hideBullet: false,
    itemType: "missing-block",
  },
);

const { selectedBlockIds, draggingDropPos } = BlockSelectDragContext.useContext();

// computed
const selected = computed(() => selectedBlockIds.value.allNonFolded.includes(props.blockId));
</script>

<style lang="scss"></style>
