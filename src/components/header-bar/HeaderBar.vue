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

    <BlockPath :block-id="mainRootBlockId" @click-path-segment="handleClickPathSegment" />

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
              :class="button.active?.value ? 'bg-muted' : 'w-fit min-w-8'"
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
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bell,
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
import MainTreeContext from "@/context/mainTree";
import { useElementSize } from "@vueuse/core";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from "../ui/breadcrumb";
import type { BlockId } from "@/common/types";
import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";
import { useI18n } from "vue-i18n";
import Pomodoro from "../pomodoro/Pomodoro.vue";
import SettingsPanelContext from "@/context/settingsPanel";
import BlockPath from "../BlockPath.vue";

const { sidePaneOpen, sidePaneDir, sidePaneWidth, enableSidePaneAnimation } =
  SidebarContext.useContext();
const { open: openSettingsPanel } = SettingsPanelContext.useContext();
const { open: openAttachmentsManager } = AttachmentsManagerContext.useContext();
const { menuPaneOpen } = MenubarContext.useContext();
const { theme, toggleTheme } = ThemeContext.useContext();
const { focusModeEnabled } = FocusModeContext.useContext();
const { timeMachineOpen } = TimeMachineContext.useContext();
const { openFusionCommand } = FusionCommandContext.useContext();
const { synced } = BlocksContext.useContext();
const { mainRootBlockId } = MainTreeContext.useContext();
const openImporter = ref(false);
const { t } = useI18n();

const handleClickPathSegment = (blockId: BlockId) => {
  mainRootBlockId.value = blockId;
};

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
    onClick: () => {
      console.log("click menu", menuPaneOpen.value);
      menuPaneOpen.value = !menuPaneOpen.value;
    },
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
    icon: () => (
      <Pomodoro>
        <AlarmClock class="size-5 stroke-[1.8]" />
      </Pomodoro>
    ),
    label: () => <>{t("kbView.headerBar.pomodoro")}</>,
    onClick: () => {},
  },
  {
    icon: () => <Search class="size-5 stroke-[1.8]" />,
    label: () => <>{t("kbView.headerBar.search")}</>,
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
    label: () =>
      theme.value === "dark"
        ? t("kbView.headerBar.switchLightTheme")
        : t("kbView.headerBar.switchDarkTheme"),
    onClick: toggleTheme,
  },
  {
    icon: () => <Bell class="size-5 stroke-[1.8]" />,
    label: () => t("kbView.headerBar.notifications"),
    onClick: () => {},
  },
  {
    icon: PanelRight,
    label: () =>
      sidePaneOpen.value ? t("kbView.headerBar.closeSidepane") : t("kbView.headerBar.openSidepane"),
    onClick: () => (sidePaneOpen.value = !sidePaneOpen.value),
    active: sidePaneOpen,
  },
];

const moreOptions: HeaderBarItemType[] = [
  {
    icon: Download,
    label: () => t("kbView.headerBar.export"),
    onClick: () => {},
  },
  {
    icon: FolderInput,
    label: () => t("kbView.headerBar.import"),
    onClick: () => {
      console.log("open importer");
      openImporter.value = true;
    },
  },
  {
    icon: Focus,
    label: () =>
      focusModeEnabled.value
        ? t("kbView.headerBar.exitFocusMode")
        : t("kbView.headerBar.enterFocusMode"),
    onClick: () => (focusModeEnabled.value = !focusModeEnabled.value),
  },
  {
    icon: FolderClosed,
    label: () => t("kbView.headerBar.attachmentsManager"),
    onClick: () => (openAttachmentsManager.value = true),
  },
  {
    icon: History,
    label: () => t("kbView.headerBar.timeMachine"),
    onClick: () => (timeMachineOpen.value = true),
  },
  {
    icon: Settings,
    label: () => t("kbView.headerBar.settings"),
    onClick: () => (openSettingsPanel.value = true),
  },
  {
    icon: HelpCircle,
    label: () => t("kbView.headerBar.help"),
    onClick: () => {},
  },
  {
    icon: LogOut,
    label: () => t("kbView.headerBar.exit"),
    onClick: () => {},
  },
];
</script>
