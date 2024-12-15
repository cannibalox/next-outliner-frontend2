<template>
  <div class="right-pane z-20 overflow-hidden flex flex-col">
    <div class="flex items-center justify-center gap-x-2 mt-2 mb-2">
      <Button :disabled="!hasPrev" variant="outline" size="icon" @click="goPrev">
        <ChevronLeft class="size-4 stroke-muted-foreground" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" class="h-8 min-w-[200px]">
            <BlockPath
              class="pointer-events-none"
              :include-self="true"
              :block-id="sidePaneCurrentBlockId"
            />
            <!-- <ChevronsUpDown class="size-4 ml-2 stroke-muted-foreground" /> -->
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="block in sidePaneBlocks"
              :key="block.id"
              :onClick="() => (sidePaneCurrentBlockId = block.id)"
            >
              <BlockPath class="pointer-events-none" :include-self="true" :block-id="block.id" />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button :disabled="!hasNext" variant="outline" size="icon" @click="goNext">
        <ChevronRight class="size-4 stroke-muted-foreground" />
      </Button>
    </div>

    <div class="h-0 flex-grow overflow-y-hidden overflow-x-hidden">
      <Transition @leave="handleLeave" @enter="handleEnter" :css="false">
        <BlockTree
          v-if="sidePaneCurrentBlockId"
          class="h-full mr-1"
          :key="sidePaneCurrentBlockId"
          :id="`side-pane-${sidePaneCurrentBlockId}`"
          :root-block-ids="[sidePaneCurrentBlockId]"
          :root-block-level="0"
          :virtual="true"
          :paddingBottom="20"
        />
      </Transition>
    </div>

    <div class="absolute z-10 top-3 right-2">
      <!-- More actions -->
      <Tooltip v-for="(button, index) in buttons" :key="index">
        <TooltipTrigger>
          <Button variant="ghost" size="icon" :onClick="button.onClick">
            <component :is="button.icon" class="size-5 stroke-[1.8]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <component :is="button.label" />
        </TooltipContent>
      </Tooltip>
    </div>
    <!-- drag handler -->
    <div
      v-if="sidePaneDir === 'bottom'"
      class="absolute top-0 z-10 left-0 w-full h-1 cursor-row-resize"
      @mousedown="handleMouseDown"
    ></div>
    <div
      v-if="sidePaneDir === 'right'"
      class="absolute top-0 z-10 left-0 w-1 h-full cursor-col-resize"
      @mousedown="handleMouseDown"
    ></div>
  </div>
</template>

<script setup lang="tsx">
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SidebarContext from "@/context/sidebar";
import {
  ArrowDownFromLine,
  ArrowRightFromLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  PanelBottomClose,
  PanelRightClose,
  X,
} from "lucide-vue-next";
import type { FunctionalComponent } from "vue";
import BlockTree from "../BlockTree.vue";
import BlockPath from "../BlockPath.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type SidePaneButton = {
  icon: FunctionalComponent;
  label: FunctionalComponent;
  onClick: () => void;
};

const {
  sidePaneDir,
  sidePaneOpen,
  sidePaneWidth,
  sidePaneHeight,
  enableSidePaneAnimation,
  sidePaneBlocks,
  sidePaneCurrentBlockId,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  dir,
} = SidebarContext.useContext();

const buttons: SidePaneButton[] = [
  {
    icon: () => (
      <div>
        {sidePaneDir.value === "right" ? (
          <ArrowDownFromLine class="size-5 stroke-[1.8]" />
        ) : (
          <ArrowRightFromLine class="size-5 stroke-[1.8]" />
        )}
      </div>
    ),
    label: () => (sidePaneDir.value === "right" ? "侧栏移动到底部" : "侧栏移动到右侧"),
    onClick: () => (sidePaneDir.value = sidePaneDir.value === "right" ? "bottom" : "right"),
  },
  {
    icon: X,
    label: () => "关闭侧栏",
    onClick: () => (sidePaneOpen.value = false),
  },
];

const handleMouseMove = (e: MouseEvent) => {
  if (sidePaneDir.value === "right") {
    sidePaneWidth.value = window.innerWidth - e.x;
  } else {
    sidePaneHeight.value = window.innerHeight - e.y;
  }
};

const handleMouseUpOrLeave = () => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUpOrLeave);
  document.removeEventListener("mouseleave", handleMouseUpOrLeave);
  enableSidePaneAnimation.value = true; // 拖曳结束时恢复 padding 动画
};

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 拖曳时关闭 padding 动画，让效果立即生效
  enableSidePaneAnimation.value = false;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUpOrLeave);
  document.addEventListener("mouseleave", handleMouseUpOrLeave);
};

// 离开动画
const handleLeave = (el: Element, done: () => void) => {
  const animation = el.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: dir.value === "right" ? "translateX(-100%)" : "translateX(100%)" },
    ],
    {
      duration: 300,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  );
  animation.onfinish = done;
};

// 进入动画
const handleEnter = (el: Element, done: () => void) => {
  if (!(el instanceof HTMLElement)) return;
  const animation = el.animate(
    [
      {
        opacity: 0,
        transform: dir.value === "right" ? "translateX(100%)" : "translateX(-100%)",
      },
      { opacity: 1, transform: "translateX(0)" },
    ],
    {
      duration: 300,
      delay: 100,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  );
  animation.onfinish = () => {
    done();
  };
};
</script>
