<template>
  <div class="side-pane-item-header flex items-center justify-between ml-[20px] mt-6 mb-2">
    <BlockPath :block-id="blockId" />
    <div class="mr-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            class="p-[1px] h-[unset] mx-1 text-muted-foreground font-normal"
            @click="focusPrev(blockId)"
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
            @click="focusNext(blockId)"
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
import { type BlockTree } from "@/context/blockTree";
import SidebarContext from "@/context/sidebar";
import type { DisplayItemId } from "@/utils/display-item";
import { ChevronDown, ChevronUp, X } from "lucide-vue-next";
import BlockPath from "../BlockPath.vue";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const { sidePaneBlockIds, focusNext, focusPrev } = SidebarContext.useContext()!;

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
