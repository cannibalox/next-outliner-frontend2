<template>
  <div class="right-pane z-20">
    <div class="absolute top-3 right-2">
      <!-- More actions -->
      <Tooltip v-for="(button, index) in buttons" :key="index">
        <TooltipTrigger>
          <Button variant="ghost" size="icon" :onClick="button.onClick">
            <component :is="button.icon" class="size-5 stroke-[1.8]"/>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <component :is="button.label" />
        </TooltipContent>
      </Tooltip>
    </div>
    <!-- drag handler -->
    <div v-if="sidePaneDir === 'bottom'" class="absolute top-0 left-0 w-full h-1 cursor-row-resize" @mousedown="handleMouseDown"></div>
    <div v-if="sidePaneDir === 'right'" class="absolute top-0 left-0 w-1 h-full cursor-col-resize" @mousedown="handleMouseDown"></div>
  </div>
</template>

<script setup lang="tsx">
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SidebarContext from "@/context/sidebar";
import { ArrowDownFromLine, ArrowRightFromLine, ChevronDown, ChevronRight, PanelBottomClose, PanelRightClose, X } from "lucide-vue-next";
import type { FunctionalComponent } from "vue";

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
}

const handleMouseUpOrLeave = () => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUpOrLeave);
  document.removeEventListener("mouseleave", handleMouseUpOrLeave);
  enableSidePaneAnimation.value = true; // 拖曳结束时恢复 padding 动画
}

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 拖曳时关闭 padding 动画，让效果立即生效
  enableSidePaneAnimation.value = false;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUpOrLeave);
  document.addEventListener("mouseleave", handleMouseUpOrLeave);
}
</script>
