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
      <div class="block-buttons"></div>

      <div class="bullet shrink-0" @contextmenu="handleContextmenu">
        <Circle class="circle" />
      </div>

      <div class="text-red-500">Missing Block</div>
    </div>

    <!-- 拖拽时，显示拖拽指示线 -->
    <div
      v-if="draggingDropPos?.itemId === itemId"
      class="absolute bottom-[-2px] left-0 h-[2px] rounded w-[40%] bg-blue-500"
      :style="{ marginLeft: draggingDropPos.relIndent + 'px' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import BlockSelectDragContext from "@/context/blockSelect";
import type { BlockTree } from "@/context/blockTree";
import { Circle, MoreHorizontal } from "lucide-vue-next";
import { computed } from "vue";
import type { DisplayItem, DisplayItemId } from "@/utils/display-item";
import BlockContextMenuContext from "@/context/blockContextMenu";

const { openAt } = BlockContextMenuContext.useContext()!;

const props = withDefaults(
  defineProps<{
    blockTree?: BlockTree;
    blockId: BlockId;
    level: number;
    hideBullet?: boolean;
    itemType?: DisplayItem["type"];
    itemId?: DisplayItemId;
  }>(),
  {
    blockTree: undefined,
    hideBullet: false,
    itemType: "missing-block",
    itemId: undefined,
  },
);

const { selectedBlockIds, draggingDropPos } = BlockSelectDragContext.useContext()!;

// computed
const selected = computed(() => selectedBlockIds.value.allNonFolded.includes(props.blockId));

const handleContextmenu = (e: MouseEvent) => {
  if (e.button !== 2) return; // 仅处理右键
  e.preventDefault();
  openAt({ x: e.clientX, y: e.clientY }, props.blockId);
};
</script>

<style lang="scss"></style>
