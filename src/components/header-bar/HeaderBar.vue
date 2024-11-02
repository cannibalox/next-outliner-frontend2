<template>
  <div
    class="header-bar fixed top-0 left-0 flex flex-row justify-between items-center w-[calc(100vw-16px)] px-[8px] py-[10px] z-10 bg-background"
    :style="{ paddingRight, transition }"
  >
    <div class="left-part">
      <!-- 左边的按钮 -->
      <div class="left-buttons">
        <Tooltip v-for="(button, index) in leftButtons" :key="index">
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              :class="button.active?.value ? 'bg-muted' : ''"
              @focus="preventFocus"
              @click="button.onClick"
            >
              <HeaderBarItem :item="button" iconOnly />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <component :is="button.label" />
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="right-part flex flex-row items-center">
      <!-- 同步状态 -->
      <Tooltip>
        <TooltipTrigger>
          <Dot class="size-8" :class="synced ? 'stroke-green-500' : 'stroke-red-500'" />
        </TooltipTrigger>
        <TooltipContent>
          {{ synced ? "实时同步中" : "同步失败" }}
        </TooltipContent>
      </Tooltip>

      <!-- 右边的按钮 -->
      <div class="right-buttons">
        <Tooltip v-for="(button, index) in rightButtons" :key="index">
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              :class="button.active?.value ? 'bg-muted' : ''"
              @focus="preventFocus"
              @click="button.onClick"
            >
              <HeaderBarItem :item="button" iconOnly />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <component :is="button.label" />
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- 更多选项 -->
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" @focus="preventFocus">
                <MoreVertical class="size-5 stroke-[1.8]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent> 更多选项 </TooltipContent>
          </Tooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="mr-2">
          <DropdownMenuItem v-for="(item, index) in moreOptions" :key="index" @click="item.onClick">
            <HeaderBarItem :item="item" iconClass="!size-4" />
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
import Importer from "@/components/Importer.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Dot,
  Download,
  Focus,
  FolderClosed,
  FolderInput,
  HelpCircle,
  History,
  LogOut,
  Menu,
  Moon,
  MoreVertical,
  PanelRight,
  Search,
  Settings,
  Sun,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import type { HeaderBarItemType } from ".";
import HeaderBarItem from "./HeaderBarItem.vue";
import SidebarContext from "@/context/sidebar";
import MenubarContext from "@/context/menubar";
import ThemeContext from "@/context/theme";
import FocusModeContext from "@/context/focusMode";
import TimeMachineContext from "@/context/timeMachine";
import FusionCommandContext from "@/context/fusionCommand";
import BlocksContext from "@/context/blocks-provider/blocks";
import AttachmentsManagerContext from "@/context/attachmentsManager";

const {
  sidePaneOpen,
  sidePaneDir,
  sidePaneWidth,
  enableSidePaneAnimation,
} = SidebarContext.useContext();
const { open: openAttachmentsManager } = AttachmentsManagerContext.useContext();
const { menuPaneOpen } = MenubarContext.useContext();
const { theme, toggleTheme } = ThemeContext.useContext();
const { focusModeEnabled } = FocusModeContext.useContext();
const { timeMachineOpen } = TimeMachineContext.useContext();
const { openFusionCommand } = FusionCommandContext.useContext();
const { synced } = BlocksContext.useContext();
const openImporter = ref(false);

// 计算 header 的宽度
// 16px 是 padding
const paddingRight = computed(() =>
  sidePaneOpen.value && sidePaneDir.value === "right" ? `${sidePaneWidth.value}px` : "0px",
);

const transition = computed(() =>
  enableSidePaneAnimation.value
    ? "padding 500ms var(--tf), opacity 500ms var(--tf)"
    : "opacity 500ms var(--tf)",
);

// 阻止按钮聚焦
const preventFocus = (e: FocusEvent) => {
  (e.target as HTMLElement)?.blur();
};

const leftButtons: HeaderBarItemType[] = [
  {
    icon: Menu,
    label: () => <>{menuPaneOpen.value ? "关闭菜单栏" : "打开菜单栏"}</>,
    onClick: () => (menuPaneOpen.value = !menuPaneOpen.value),
    active: menuPaneOpen,
  },
  {
    icon: ArrowLeft,
    label: () => <>后退</>,
    onClick: () => {},
  },
  {
    icon: ArrowRight,
    label: () => <>前进</>,
    onClick: () => {},
  },
];

const rightButtons: HeaderBarItemType[] = [
  {
    icon: () => <Search class="size-5 stroke-[1.8]" />,
    label: () => <>搜索</>,
    onClick: () => openFusionCommand(""),
  },
  {
    icon: () => (
      <div>
        {theme.value === "dark" ? (
          <Moon class="size-5 stroke-[1.8]" />
        ) : (
          <Sun class="size-5 stroke-[1.8]" />
        )}
      </div>
    ),
    label: () => <>切换黑暗 / 明亮主题</>,
    onClick: toggleTheme,
  },
  {
    icon: PanelRight,
    label: () => <>{sidePaneOpen.value ? "关闭侧栏" : "打开侧栏"}</>,
    onClick: () => (sidePaneOpen.value = !sidePaneOpen.value),
    active: sidePaneOpen,
  },
];

const moreOptions: HeaderBarItemType[] = [
  {
    icon: Download,
    label: () => <>导出</>,
    onClick: () => {},
  },
  {
    icon: FolderInput,
    label: () => <>导入</>,
    onClick: () => {
      console.log("open importer");
      openImporter.value = true;
    },
  },
  {
    icon: Focus,
    label: () => <>{focusModeEnabled.value ? "退出专注模式" : "进入专注模式"}</>,
    onClick: () => (focusModeEnabled.value = !focusModeEnabled.value),
  },
  {
    icon: FolderClosed,
    label: () => <>附件管理器</>,
    onClick: () => openAttachmentsManager.value = true,
  },
  {
    icon: History,
    label: () => <>时光机</>,
    onClick: () => (timeMachineOpen.value = true),
  },
  {
    icon: Settings,
    label: () => <>设置</>,
    onClick: () => {},
  },
  {
    icon: HelpCircle,
    label: () => <>帮助文档</>,
    onClick: () => {},
  },
  {
    icon: LogOut,
    label: () => <>退出</>,
    onClick: () => {},
  },
];
</script>
