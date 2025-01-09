<template>
  <div class="side-pane-item-header flex items-center justify-between ml-[20px] mt-6 mb-2">
    <BlockPath :block-id="blockId" />
    <div class="mr-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            class="p-[1px] h-[unset] mx-1 text-muted-foreground font-normal"
            @click="handlePrevItem"
          >
            <ChevronUp class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("kbView.sidePane.prev") }}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            class="p-[1px] h-[unset] mx-1 text-muted-foreground font-normal"
            @click="handleNextItem"
          >
            <ChevronDown class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("kbView.sidePane.next") }}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            class="p-[1px] mx-1 h-[unset] text-muted-foreground font-normal"
            @click="handleRemove"
          >
            <X class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("kbView.sidePane.remove") }}
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import BlocksContext from "@/context/blocks/blocks";
import { BlockTreeContext, type BlockTree } from "@/context/blockTree";
import type { DisplayItemId } from "@/utils/display-item";
import { computed } from "vue";
import BlockPath from "../BlockPath.vue";
import { Button } from "../ui/button";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-vue-next";
import SidebarContext from "@/context/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const { sidePaneBlockIds } = SidebarContext.useContext()!;
const { getBlockTree } = BlockTreeContext.useContext()!;

const props = defineProps<{
  blockTree?: BlockTree;
  blockId: BlockId;
  itemId?: DisplayItemId;
}>();

const handleRemove = () => {
  sidePaneBlockIds.value = (sidePaneBlockIds.value as BlockId[]).filter(
    (id) => id !== props.blockId,
  );
};

const handleNextItem = () => {
  const tree = getBlockTree("side-pane");
  if (!tree) return;
  const selectedIndex = sidePaneBlockIds.value.indexOf(props.blockId);
  if (selectedIndex === -1) return;
  const nextIndex = selectedIndex === sidePaneBlockIds.value.length - 1 ? 0 : selectedIndex + 1;
  const nextId = sidePaneBlockIds.value[nextIndex];
  const nextItem = tree.findDi((di) => di.type === "basic-block" && di.block.id === nextId);
  if (!nextItem) return;
  tree.focusDi(nextItem.itemId, { highlight: true, scrollIntoView: true });
};

const handlePrevItem = () => {
  const tree = getBlockTree("side-pane");
  if (!tree) return;
  const selectedIndex = sidePaneBlockIds.value.indexOf(props.blockId);
  if (selectedIndex === -1) return;
  const prevIndex = selectedIndex === 0 ? sidePaneBlockIds.value.length - 1 : selectedIndex - 1;
  const prevId = sidePaneBlockIds.value[prevIndex];
  const prevItem = tree.findDi((di) => di.type === "basic-block" && di.block.id === prevId);
  if (!prevItem) return;
  tree.focusDi(prevItem.itemId, { highlight: true, scrollIntoView: true });
};
</script>
