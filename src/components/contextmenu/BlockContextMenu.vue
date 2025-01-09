<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="min-w-[200px] overflow-y-auto max-h-[var(--radix-dropdown-menu-content-available-height)]"
    >
      <DropdownMenuItem
        class="!text-red-500"
        :disabled="!deleteBlock(true, blockId, undefined)"
        @click="deleteBlock(false, blockId, $event)"
      >
        <Trash2 class="size-4 mr-2" />
        {{ $t("kbView.command.deleteBlock") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :disabled="!openFieldValuesInspectorCommand(true, blockId, undefined)"
        @click="openFieldValuesInspectorCommand(false, blockId, $event)"
      >
        <Database class="size-4 mr-2" />
        {{ $t("kbView.command.openFieldValuesInspector") }}
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

      <!-- 排序 -->
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

      <!-- 设置块引用颜色 -->
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Paintbrush class="size-4 mr-2" />
          {{ $t("kbView.command.setBlockRefColor") }}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            v-for="color in predefinedColors"
            :key="color"
            :disabled="!getBlockRefColorSetter(color)(true, blockId, undefined)"
            @click="getBlockRefColorSetter(color)(false, blockId, $event)"
          >
            <div
              class="size-4 mr-2 rounded-sm"
              :style="{ backgroundColor: `var(--highlight-${color})` }"
            ></div>
            {{ $t(`kbView.command.${color}`) }}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuItem
        :disabled="!exportBlock(true, blockId, undefined)"
        @click="exportBlock(false, blockId, $event)"
      >
        <Download class="size-4 mr-2" />
        {{ $t("kbView.command.export") }}
      </DropdownMenuItem>
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
  Database,
  Paintbrush,
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
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { useTaskQueue } from "@/plugins/taskQueue";
import BlocksDropdown from "@/context/blocks/blocks";
import BlockMoverContext from "@/context/blockMover";
import FavoriteContext from "@/context/favorite";
import SidebarContext from "@/context/sidebar";
import type { BlockPos } from "@/context/blocks/view-layer/blocksEditor";
import LastFocusContext from "@/context/lastFocus";
import ExporterContext from "@/context/exporter";
import FieldValueInspectorContext from "@/context/fieldValueInspector";

type CommandExec = (
  test: boolean,
  blockId: BlockId | undefined,
  event: MouseEvent | undefined,
) => boolean;

defineProps<{
  blockId?: BlockId;
}>();

const taskQueue = useTaskQueue();
const { blockEditor, blocksManager } = BlocksDropdown.useContext()!;
const { openBlockMover } = BlockMoverContext.useContext()!;
const { favoriteBlockIds } = FavoriteContext.useContext()!;
const { sidePaneBlockIds } = SidebarContext.useContext()!;
const { lastFocusedBlockTree } = LastFocusContext.useContext()!;
const { openExporter } = ExporterContext.useContext()!;
const { openFieldValuesInspector } = FieldValueInspectorContext.useContext()!;

const predefinedColors = ["red", "green", "blue", "yellow", "gray", "orange", "purple"];

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
    sidePaneBlockIds.value = [...sidePaneBlockIds.value, blockId];
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
      const tree = lastFocusedBlockTree.value;
      if (!tree) return;
      await blockEditor.insertMirrorBlock({ pos, srcBlockId: blockId });
      const diBelow = tree.getDiBelow(blockId);
      diBelow && tree.focusDi(diBelow[0].itemId);
    });
  }
  return !!blockId;
};

const exportBlock: CommandExec = (test, blockId, event) => {
  if (!test && blockId) {
    openExporter(blockId);
  }
  return !!blockId;
};

const openFieldValuesInspectorCommand: CommandExec = (test, blockId) => {
  if (!test && blockId) {
    openFieldValuesInspector(blockId);
  }
  return !!blockId;
};

const getBlockRefColorSetter: (color: string) => CommandExec =
  (color) => (test, blockId, event) => {
    if (!test && blockId && event) {
      taskQueue.addTask(async () => {
        const block = blocksManager.getBlock(blockId);
        if (!block) return;
        blockEditor.setBlockMetadata({
          blockId,
          metadata: {
            ...block.metadata,
            blockRefColor: color,
          },
        });
      });
    }
    return !!blockId;
  };
</script>
