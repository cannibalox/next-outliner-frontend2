<template>
  <ContextMenu>
    <ContextMenuTrigger>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="min-w-[200px]">
      <ContextMenuItem
        class="!text-red-500"
        :disabled="!deleteBlock(true, blockId)"
        @click="deleteBlock(false, blockId)"
      >
        <Trash2 class="size-4 mr-2" />
        {{ $t("kbView.command.deleteBlock") }}
      </ContextMenuItem>
      <ContextMenuItem>
        <Copy class="size-4 mr-2" />
        {{ $t("kbView.command.copyBlockReference") }}
      </ContextMenuItem>
      <ContextMenuItem>
        <FlipHorizontal class="size-4 mr-2" />
        {{ $t("kbView.command.copyBlockMirror") }}
      </ContextMenuItem>
      <ContextMenuItem>
        <Bookmark class="size-4 mr-2" />
        {{ $t("kbView.command.addToFavorite") }}
      </ContextMenuItem>
      <ContextMenuItem>
        <Sidebar class="size-4 mr-2" />
        {{ $t("kbView.command.addToSidepane") }}
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Download class="size-4 mr-2" />
          {{ $t("kbView.command.exportAs") }}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem>Markdown</ContextMenuItem>
          <ContextMenuItem>HTML</ContextMenuItem>
          <ContextMenuItem>PDF</ContextMenuItem>
          <ContextMenuItem>TXT</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { Copy, Trash2, FlipHorizontal, Bookmark, Sidebar, Download } from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "../ui/context-menu";
import type { BlockId } from "@/common/types";
import { useTaskQueue } from "@/plugins/taskQueue";
import BlocksContext from "@/context/blocks-provider/blocks";

type CommandExec = (test?: boolean, blockId?: BlockId) => boolean;

defineProps<{
  blockId?: BlockId;
}>();

const taskQueue = useTaskQueue();
const { blockEditor } = BlocksContext.useContext();

const deleteBlock: CommandExec = (test, blockId) => {
  console.log(blockId);
  if (!test && blockId) {
    taskQueue.addTask(async () => {
      await blockEditor.deleteBlock(blockId);
    });
  }
  return !!blockId;
};
</script>
