<template>
  <div
    class="side-pane-item-header flex items-center justify-between ml-[20px] mt-8 mb-2 first:mt-2"
  >
    <BlockPath :block-id="blockId" />
    <div class="mr-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" class="p-[1px] h-[unset] mx-1 text-muted-foreground font-normal">
            <ChevronUp class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("kbView.sidePane.prev") }}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" class="p-[1px] h-[unset] mx-1 text-muted-foreground font-normal">
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
import type { BlockTree } from "@/context/blockTree";
import type { DisplayItemId } from "@/utils/display-item";
import { computed } from "vue";
import BlockPath from "../BlockPath.vue";
import { Button } from "../ui/button";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-vue-next";
import SidebarContext from "@/context/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const { sidePaneBlockIds } = SidebarContext.useContext()!;

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
</script>
