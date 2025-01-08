<template>
  <div class="right-pane z-20 overflow-hidden flex flex-col">
    <div class="flex items-center justify-between py-[10px] px-[8px] mr-2">
      <div>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="sidePaneOpen = false">
              <ChevronsRight class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> </TooltipContent>
        </Tooltip>

        <Tooltip v-if="sidePaneDir === 'bottom'">
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="sidePaneDir = 'right'">
              <PanelRight class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> </TooltipContent>
        </Tooltip>

        <Tooltip v-if="sidePaneDir === 'right'">
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="sidePaneDir = 'bottom'">
              <PanelBottom class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> </TooltipContent>
        </Tooltip>
      </div>

      <div>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon">
              <SortDesc class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon">
              <Filter class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> </TooltipContent>
        </Tooltip>
      </div>
    </div>
    <BlockTree
      id="side-pane"
      class="h-full"
      :root-block-ids="sidePaneBlockIds"
      :root-block-level="0"
      :add-side-pane-header="true"
      :enlarge-root-block="false"
      :show-backlinks="false"
      :show-potential-links="false"
      :padding-top="0"
    ></BlockTree>
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
  ChevronsRight,
  Filter,
  PanelBottom,
  PanelRight,
  SortDesc,
  X,
} from "lucide-vue-next";
import type { FunctionalComponent } from "vue";
import BlockTree from "../BlockTree.vue";

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
  sidePaneBlockIds,
  sidePaneCurrentBlockId,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  dir,
} = SidebarContext.useContext()!;

const buttons: SidePaneButton[] = [
  {
    icon: () => (
      <div>
        {sidePaneDir.value === "right" ? (
          <ArrowDownFromLine class="size-4 stroke-[1.8]" />
        ) : (
          <ArrowRightFromLine class="size-4 stroke-[1.8]" />
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
