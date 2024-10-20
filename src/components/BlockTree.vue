<template>
  <div
    class="block-tree"
    ref="$blockTree"
    :block-tree-id="id"
    :style="{
      '--padding-top': `${paddingTop ?? 0}px`,
      '--padding-bottom': `${paddingBottom ?? 200}px`
    }"
  >
    <virt-list
      v-if="virtual"
      itemKey="itemId"
      class="vlist"
      :list="displayItems"
      :buffer="10"
      :minSize="30"
      ref="$vlist"
      itemClass="block-container"
    >
      <template #default="{ itemData }">
        <BasicBlockItem
          v-if="itemData.type == 'block'"
          :block-tree="controller"
          :item="itemData"
          :force-fold="forceFold"
        ></BasicBlockItem>
      </template>
      <template #footer> </template>
    </virt-list>
  </div>
</template>

<script setup lang="ts">
import type { BlockId, Block } from "@/common/types";
import { globalEnv } from "@/main";
import type { BlockTree, BlockTreeEventMap, BlockTreeProps } from "@/modules/blockTreeRegistry";
import {
  defaultDiGenerator,
  type DisplayItem,
  type DisplayItemGenerator,
} from "@/utils/display-item";
import mitt from "@/utils/mitt";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { VirtList } from "vue-virt-list";
import { EditorView as PmEditorView } from "prosemirror-view";
import { EditorView as CmEditorView } from "@codemirror/view";
import BasicBlockItem from "./display-items/BasicBlockItem.vue";

const props = defineProps<BlockTreeProps>();
const $blockTree = ref<HTMLElement | null>(null);
const $vlist = ref<InstanceType<typeof VirtList> | null>(null);
const displayItems = shallowRef<DisplayItem[]>();
const { eventBus, blockTreeRegistry } = globalEnv;
const localEventBus = mitt<BlockTreeEventMap>();
const changeRef = eventBus.eventRefs.afterBlocksTrCommit;
const editorViews = new Map<BlockId, PmEditorView | CmEditorView>();
let fixedOffset: number | null = null;
// 在设置了 forceFold 时，仍展开显示的所有块
const tempExpanded = ref(new Set<BlockId>());

const updateDisplayItems = () => {
  const diGenerator = props.diGenerator ?? defaultDiGenerator;

  // 计算 displayItems
  const blockTreeId = props.id;
  console.time(`calc displayItems ${blockTreeId}`);
  displayItems.value = diGenerator({
    rootBlockIds: props.rootBlockIds,
    rootBlockLevel: props.rootBlockLevel,
    forceFold: props.forceFold,
    tempExpanded: tempExpanded.value,
  });
  console.log("displayItems", displayItems.value);
  console.timeEnd(`calc displayItems ${blockTreeId}`);

  // 更新 $vlist
  $vlist.value?.forceUpdate?.();

  nextTick(() => {
    // 如果设置了 fixedOffset，则使 $vlist 滚动到 fixedOffset
    if (fixedOffset != null) $vlist.value?.scrollToOffset(fixedOffset);

    // 触发 displayItemsUpdated 事件
    localEventBus.emit("displayItemsUpdated", [displayItems.value!]);
  });
};

watch([() => props.rootBlockIds, changeRef], updateDisplayItems, {
  immediate: true,
});

const nextUpdate = (cb?: () => void | Promise<void>) => {
  return new Promise<void>((resolve) => {
    localEventBus.once("displayItemsUpdated", () => {
      cb && cb();
      resolve();
    });
  });
};

const getBlockAbove = (blockId: BlockId): Block | null => {
  return getPredecessorBlock(blockId); // TODO 未引入多列布局，因此 getBlockAbove 和 getPredecessorBlock 的实现是一样的
};

const getBlockBelow = (blockId: BlockId): Block | null => {
  return getSuccessorBlock(blockId); // TODO 未引入多列布局，因此 getBlockBelow 和 getSuccessorBlock 的实现是一样的
};

const getPredecessorBlock = (blockId: BlockId): Block | null => {
  for (let i = 0; i < displayItems.value!.length; i++) {
    const itemI = displayItems.value![i];
    if (itemI.type == "block" && itemI.block.id == blockId) {
      for (let j = i - 1; j >= 0; j--) {
        const itemJ = displayItems.value![j];
        if (itemJ.type == "block") {
          return itemJ.block;
        }
      }
      return null;
    }
  }
  return null;
};

const getSuccessorBlock = (blockId: BlockId): Block | null => {
  for (let i = 0; i < displayItems.value!.length; i++) {
    const itemI = displayItems.value![i];
    if (itemI.type == "block" && itemI.block.id == blockId) {
      for (let j = i + 1; j < displayItems.value!.length; j++) {
        const itemJ = displayItems.value![j];
        if (itemJ.type == "block") {
          return itemJ.block;
        }
      }
      return null;
    }
  }
  return null;
};

const getEditorView = (blockId: BlockId) => editorViews.get(blockId) ?? null;

const scrollBlockIntoView = (blockId: BlockId) => {
  const index = displayItems.value!.findIndex((item) => item.type == "block" && item.block.id == blockId);
  if (index != null && index >= 0) {
    $vlist.value?.scrollToIndex(index);
  }
}

const focusBlock = (blockId: BlockId, scrollIntoView: boolean = true) => {
  // 父元素，滚动时以其为基准
  const $parent = $blockTree.value;
  if (!$parent) return;

  let editorView = getEditorView(blockId);
  if (!editorView) {
    scrollIntoView && scrollBlockIntoView(blockId);
    editorView = getEditorView(blockId);
  }

  if (editorView) {
    editorView.focus();
  }
}

const controller: BlockTree = {
  getProps: () => props,
  getId: () => props.id,
  getDom: () => $blockTree.value!,
  getRootBlockIds: () => props.rootBlockIds ?? [],
  getDisplayItems: () => displayItems.value!,
  getSuccessorBlock,
  getPredecessorBlock,
  getBlockAbove,
  getBlockBelow,
  getEditorViews: () => editorViews,
  registerEditorView: (blockId, editorView) => editorViews.set(blockId, editorView),
  unregisterEditorView: (blockId) => editorViews.delete(blockId),
  localEventBus,
  nextUpdate,
  getEditorView,
  focusBlock,
};
defineExpose(controller);

onMounted(() => {
  const el = $blockTree.value;
  if (el) Object.assign(el, { controller });
  blockTreeRegistry.registerBlockTree(controller);
});

onUnmounted(() => {
  blockTreeRegistry.unregisterBlockTree(props.id);
});
</script>

<style lang="scss">
.block-tree {
  position: relative;

  // 用 footer 遮挡掉不想看到的缩进线
  .vlist {
    padding-top: var(--padding-top);
    
    [data-id="footer"] {
      flex-grow: 1;
      flex-shrink: 0;
      min-height: var(--padding-bottom);
      background-color: var(--bg-color-primary);
      position: relative;
      z-index: 99;
    }
  }

  .block-item.fold-disappear {
    opacity: 0;
    transition: opacity 1000ms ease-in-out;
  }

  .block-container {
    z-index: 1;
    position: relative;
  }

  .bg {
    position: absolute;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    top: 0;
    padding: inherit;
    padding-left: 26px;

    .indent-line {
      height: 100%;
      padding-right: calc(36px - 1px); // - border-right
      border-left: var(--border-indent);
    }
  }
}

// 高亮
.block-item.highlight-keep .block-content,
.block-item.highlight-keep .bullet {
  background-color: var(--highlight-block-bg);
}

.block-item.highlight-fade .block-content,
.block-item.highlight-fade .bullet {
  background-color: unset !important;
  transition: all 300ms ease-out;
}

.suggestion-item .highlight-keep {
  background-color: var(--text-highlight);
}

.suggestion-item .highlight-fade {
  background-color: unset !important;
  transition: all 300ms ease-out;
}

span.cloze.highlight-keep {
  background-color: var(--cloze-highlight-color);
  box-shadow: var(--cloze-highlight-color) 0 0 10px 2px;
}

span.cloze.highlight-fade {
  background-color: unset !important;
  box-shadow: unset !important;
  transition: all 300ms ease-out;
}
</style>
