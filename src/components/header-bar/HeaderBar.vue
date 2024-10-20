<template>
  <div class="header-bar">
    <div class="left-part">
      <!-- 左边的按钮 -->
      <div class="left-buttons">
        <Tooltip v-for="(button, index) in leftButtons" :key="index">
          <TooltipTrigger>
            <Button variant="ghost" size="icon" @click="button.onClick">
              <component :is="button.icon" class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ button.label }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="right-part flex flex-row items-center">
      <!-- 同步状态 -->
      <Tooltip>
        <TooltipTrigger>
          <Dot class="size-8" :class="allSyncedRef ? 'stroke-green-500' : 'stroke-red-500'" />
        </TooltipTrigger>
        <TooltipContent>
          {{ allSyncedRef ? "实时同步中" : "同步失败" }}
        </TooltipContent>
      </Tooltip>

      <!-- 右边的按钮 -->
      <div class="right-buttons">
        <Tooltip v-for="(button, index) in rightButtons" :key="index">
          <TooltipTrigger>
            <Button variant="ghost" size="icon" @click="button.onClick">
              <component :is="button.icon" class="size-5 stroke-[1.8]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ button.label }}
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- 更多选项 -->
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon">
                <MoreVertical class="size-5 stroke-[1.8]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent> 更多选项 </TooltipContent>
          </Tooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="mr-2">
          <DropdownMenuItem v-for="(item, index) in moreOptions" :key="index" @click="item.onClick">
            <HeaderBarItem :item="item" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <Teleport to="body">
      <Importer v-model:open="openImporter" />
    </Teleport>
  </div>
</template>

<script setup lang="tsx">
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { globalEnv } from "@/main";
import {
  PanelLeft,
  Moon,
  Sun,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  Download,
  FolderInput,
  Dot,
  Search,
} from "lucide-vue-next";
import { h, ref, type Component } from "vue";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Importer from "@/components/Importer.vue";
import HeaderBarItem from "./HeaderBarItem.vue";
import type { HeaderButtonItem, MoreOptionsItem } from ".";

const { globalUiVars, yjsManager } = globalEnv;
const { theme, toggleTheme } = globalUiVars;
const { allSyncedRef } = yjsManager;
const openImporter = ref(false);

const leftButtons: HeaderButtonItem[] = [
  {
    icon: PanelLeft,
    label: "打开侧边栏",
    onClick: () => {},
  },
  {
    icon: ArrowLeft,
    label: "后退",
    onClick: () => {},
  },
  {
    icon: ArrowRight,
    label: "前进",
    onClick: () => {},
  },
];

const rightButtons: HeaderButtonItem[] = [
  {
    icon: Search,
    label: "搜索",
    onClick: () => {},
  },
  {
    icon: (
      <div>
        {theme.value === "dark" ? (
          <Moon class="size-5 stroke-[1.8]" />
        ) : (
          <Sun class="size-5 stroke-[1.8]" />
        )}
      </div>
    ),
    label: "切换黑暗 / 明亮",
    onClick: toggleTheme,
  },
];

const moreOptions: MoreOptionsItem[] = [
  {
    icon: Download,
    label: "导出",
    onClick: () => {},
  },
  {
    itemComp: (
      <div class="flex flex-row items-center">
        <FolderInput class="size-4 stroke-[1.8] mr-3" />
        导入
      </div>
    ),
    onClick: () => {
      console.log("open importer");
      openImporter.value = true;
    },
  },
];
</script>

<style lang="scss">
.header-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--headerbar-height) - 10px);
  background-color: transparent;
  margin: 10px 0 0 0;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
