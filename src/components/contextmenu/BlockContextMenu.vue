<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuContent class="min-w-[200px]">
      <DropdownMenuItem
        class="!text-red-500"
        :disabled="!deleteBlock(true, blockId, undefined)"
        @click="deleteBlock(false, blockId, $event)"
      >
        <Trash2 class="size-4 mr-2" />
        {{ $t("kbView.command.deleteBlock") }}
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Copy class="size-4 mr-2" />
        {{ $t("kbView.command.copyBlockReference") }}
      </DropdownMenuItem>
      <DropdownMenuItem>
        <FlipHorizontal class="size-4 mr-2" />
        {{ $t("kbView.command.copyBlockMirror") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!insertMirrorBelow(true, blockId, undefined)"
        @click="insertMirrorBelow(false, blockId, $event)"
      >
        <FlipHorizontal class="size-4 mr-2" />
        {{ $t("kbView.command.insertMirrorBelow") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!addToFavorite(true, blockId, undefined)"
        @click="addToFavorite(false, blockId, $event)"
      >
        <Bookmark class="size-4 mr-2" />
        {{ $t("kbView.command.addToFavorite") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!addToSidePane(true, blockId, undefined)"
        @click="addToSidePane(false, blockId, $event)"
      >
        <Sidebar class="size-4 mr-2" />
        {{ $t("kbView.command.addToSidepane") }}
      </DropdownMenuItem>
      <!-- <DropdownMenuItem>
        <Archive class="size-4 mr-2" />
        {{ $t("kbView.command.archiveDone") }}
      </DropdownMenuItem> -->
      <DropdownMenuItem
        :disabled="!moveBlock(true, blockId, undefined)"
        @click="moveBlock(false, blockId, $event)"
      >
        <ArrowRight class="size-4 mr-2" />
        {{ $t("kbView.command.moveBlock") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!moveBlockLeaveRef(true, blockId, undefined)"
        @click="moveBlockLeaveRef(false, blockId, $event)"
      >
        <ArrowRight class="size-4 mr-2" />
        {{ $t("kbView.command.moveBlockLeaveRef") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!moveBlock(true, blockId, undefined)"
        @click="moveBlock(false, blockId, $event)"
      >
        <ArrowRight class="size-4 mr-2" />
        {{ $t("kbView.command.moveBlockLeaveMirror") }}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <SortAsc class="size-4 mr-2" />
          {{ $t("kbView.command.sortDirectChildren") }}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>
            <ArrowUpAZ class="size-4 mr-2" />
            {{ $t("kbView.command.sortDictAsc") }}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ArrowDownAZ class="size-4 mr-2" />
            {{ $t("kbView.command.sortDictDesc") }}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarArrowUp class="size-4 mr-2" />
            {{ $t("kbView.command.ctimeAsc") }}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarArrowDown class="size-4 mr-2" />
            {{ $t("kbView.command.ctimeDesc") }}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarArrowUp class="size-4 mr-2" />
            {{ $t("kbView.command.mtimeAsc") }}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarArrowDown class="size-4 mr-2" />
            {{ $t("kbView.command.mtimeDesc") }}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Download class="size-4 mr-2" />
          {{ $t("kbView.command.exportAs") }}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>Markdown</DropdownMenuItem>
          <DropdownMenuItem>HTML</DropdownMenuItem>
          <DropdownMenuItem>PDF</DropdownMenuItem>
          <DropdownMenuItem>TXT</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import {
  Copy,
  Trash2,
  FlipHorizontal,
  Bookmark,
  Sidebar,
  Download,
  SortAsc,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowUp,
  CalendarArrowDown,
  Archive,
  MoveRight,
  ArrowRight,
} from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { BlockId } from "@/common/types";
import { useTaskQueue } from "@/plugins/taskQueue";
import BlocksDropdown from "@/context/blocks-provider/blocks";
import BlockMoverContext from "@/context/blockMover";
import FavoriteContext from "@/context/favorite";
import SidebarContext from "@/context/sidebar";
import type { BlockPos } from "@/context/blocks-provider/app-state-layer/blocksEditor";
import LastFocusContext from "@/context/lastFocus";

type CommandExec = (
  test: boolean,
  blockId: BlockId | undefined,
  event: MouseEvent | undefined,
) => boolean;

defineProps<{
  blockId?: BlockId;
}>();

const taskQueue = useTaskQueue();
const { blockEditor } = BlocksDropdown.useContext();
const { openBlockMover } = BlockMoverContext.useContext();
const { favoriteBlockIds } = FavoriteContext.useContext();
const { sidePaneBlockIds } = SidebarContext.useContext();
const { lastFocusedBlockTree } = LastFocusContext.useContext();

const deleteBlock: CommandExec = (test, blockId) => {
  if (!test && blockId) {
    taskQueue.addTask(async () => {
      await blockEditor.deleteBlock({ blockId });
    });
  }
  return !!blockId;
};

const moveBlock: CommandExec = (test, blockId, event) => {
  if (!test && blockId && event) {
    const pos = { x: event.clientX, y: event.clientY };
    setTimeout(() => {
      openBlockMover(pos);
    }, 200); // 等待 contextmenu 的动画结束
  }
  return !!blockId;
};

const moveBlockLeaveRef: CommandExec = (test, blockId, event) => {
  if (!test && blockId && event) {
    const pos = { x: event.clientX, y: event.clientY };
    setTimeout(() => {
      openBlockMover(pos, { leaveRef: true });
    }, 200); // 等待 contextmenu 的动画结束
  }
  return !!blockId;
};

const addToSidePane: CommandExec = (test, blockId) => {
  const notInSidePane = !!blockId && !sidePaneBlockIds.value.includes(blockId);
  if (!test && notInSidePane) {
    sidePaneBlockIds.value.push(blockId);
  }
  return !!blockId && notInSidePane;
};

const addToFavorite: CommandExec = (test, blockId) => {
  const notInFavorite = !!blockId && !favoriteBlockIds.value.includes(blockId);
  if (!test && notInFavorite) {
    favoriteBlockIds.value.push(blockId);
  }
  return !!blockId && notInFavorite;
};

const insertMirrorBelow: CommandExec = (test, blockId) => {
  if (!test && blockId) {
    taskQueue.addTask(async () => {
      const pos: BlockPos = {
        baseBlockId: blockId,
        offset: 1,
      };
      const { focusNext } =
        (await blockEditor.insertMirrorBlock({ pos, srcBlockId: blockId })) ?? {};
      const tree = lastFocusedBlockTree.value;
      if (focusNext && tree) {
        tree.focusBlock(focusNext);
      }
    });
  }
  return !!blockId;
};
</script>
