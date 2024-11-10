<template>
  <!-- 头部栏 -->
  <HeaderBar />
  <!-- mr-1 是为了让滚动条和屏幕边缘留出一点空隙 -->
  <BlockTree
    v-if="synced && mainRootBlockRef"
    class="h-[100vh] mr-1"
    id="main"
    :style="{
      paddingRight: sidePaneOpen && sidePaneDir === 'right' ? `${sidePaneWidth}px` : '0px',
      paddingBottom: sidePaneOpen && sidePaneDir === 'bottom' ? `${sidePaneHeight}px` : '0px',
      transition: enableSidePaneAnimation ? 'padding 500ms var(--tf)' : 'none',
    }"
    :virtual="true"
    :root-block-ids="[mainRootBlockRef.id]"
    :root-block-level="0"
    :padding-top="60"
  ></BlockTree>
  <div
    v-else
    class="h-[100vh] mr-1 flex justify-center items-center text-muted-foreground"
    :style="{
      paddingRight: sidePaneOpen && sidePaneDir === 'right' ? `${sidePaneWidth}px` : '0px',
      paddingBottom: sidePaneOpen && sidePaneDir === 'bottom' ? `${sidePaneHeight}px` : '0px',
      transition: enableSidePaneAnimation ? 'padding 500ms var(--tf)' : 'none',
    }"
  >
    <Loader2 class="animate-spin mr-2" />
    {{ $t("kbView.loadingKb") }}
  </div>
  <!-- 右侧侧边栏 -->
  <SidePane
    v-if="sidePaneOpen && sidePaneDir === 'right'"
    v-motion
    :initial="{ opacity: 0, width: 0 }"
    :enter="{
      opacity: 1,
      width: sidePaneWidth,
      transition: {
        duration: 500,
        type: 'keyframes',
        ease: [0.4, 0, 0.2, 1],
      },
    }"
    data-side="right"
    class="absolute right-0 top-0 h-full border-l"
    :style="{ width: `${sidePaneWidth}px` }"
  />
  <!-- 底部侧边栏 -->
  <SidePane
    v-if="sidePaneOpen && sidePaneDir === 'bottom'"
    v-motion
    :initial="{ opacity: 0, height: 0 }"
    :enter="{
      opacity: 1,
      height: sidePaneHeight,
      transition: {
        duration: 500,
        type: 'keyframes',
        ease: [0.4, 0, 0.2, 1],
      },
    }"
    class="absolute bottom-0 left-0 w-[100vw] border-t"
    :style="{ height: `${sidePaneHeight}px` }"
  />
  <!-- 菜单栏 -->
  <!-- <MenuPane /> -->
  <!-- 浮动数学输入框 -->
  <FloatingMathInput />
  <!-- 融合命令 -->
  <FusionCommand />
  <!-- 时光机 -->
  <TimeMachine />
  <RefSuggestions />
  <!-- 附件管理器 -->
  <AttachmentsManager />
</template>

<script setup lang="ts">
import SidebarContext from "../../context/sidebar";
import HeaderBar from "../../components/header-bar/HeaderBar.vue";
import FusionCommand from "../../components/fusion-command/FusionCommand.vue";
import SidePane from "../../components/side-pane/SidePane.vue";
import TimeMachine from "../../components/time-machine/TimeMachine.vue";
import FloatingMathInput from "../../components/FloatingMathInput.vue";
import BlocksContext from "../../context/blocks-provider/blocks";
import { Loader2 } from "lucide-vue-next";
import BlockTree from "@/components/BlockTree.vue";
import { watch } from "vue";
import RefSuggestions from "@/components/ref-suggestions/RefSuggestions.vue";
import AttachmentsManager from "@/components/attachments-mgr/AttachmentsManager.vue";
import MainTreeContext from "@/context/mainTree";

const { sidePaneOpen, sidePaneDir, sidePaneWidth, sidePaneHeight, enableSidePaneAnimation } =
  SidebarContext.useContext();
const { synced, blocksManager } = BlocksContext.useContext();
const { mainRootBlockRef } = MainTreeContext.useContext();

watch(synced, () => {
  if (synced.value) {
    const rootBlockRef = blocksManager.getRootBlockRef();
    if (rootBlockRef.value == null) blocksManager.ensureTree();
  }
});
</script>
