<template>
  <div
    class="block-tree"
    ref="$blockTree"
    :block-tree-id="id"
    :style="{
      '--padding-bottom': `${paddingBottom ?? 200}px`,
      '--padding-top': `${paddingTop ?? 0}px`,
    }"
    @pointerdown="handlePointerDown"
  >
    <virt-list
      v-if="virtual"
      itemKey="itemId"
      class="vlist"
      :list="displayItems"
      :buffer="10"
      :minSize="24"
      ref="$vlist"
      itemClass="block-container"
    >
      <template #header> </template>
      <template #default="{ itemData }">
        <BasicBlockItem
          v-if="itemData.type == 'basic-block'"
          :key="itemData.block.id"
          :block-tree="controller"
          :block="itemData.block"
          :level="itemData.level"
          :force-fold="forceFold"
        ></BasicBlockItem>
        <BacklinksBlockItem
          v-if="itemData.type == 'backlink-block'"
          :key="itemData.block.id"
          :block-tree="controller"
          :block="itemData.block"
          :ref-block-id="itemData.refBlockId"
        ></BacklinksBlockItem>
        <BacklinksHeaderItem
          v-if="itemData.type == 'backlink-header'"
          :key="itemData.blockId"
          :block-id="itemData.blockId"
          :backlinks="itemData.backlinks"
        ></BacklinksHeaderItem>
        <PotentialLinksHeaderItem
          v-if="itemData.type == 'potential-links-header'"
          :key="itemData.blockId"
          :block-id="itemData.blockId"
          :potential-links="itemData.potentialLinks"
        ></PotentialLinksHeaderItem>
        <PotentialLinksBlockItem
          v-if="itemData.type == 'potential-links-block'"
          :key="itemData.blockId"
          :block-tree="controller"
          :block="itemData.block"
          :ref-block-id="itemData.refBlockId"
        ></PotentialLinksBlockItem>
      </template>
      <template #footer> </template>
    </virt-list>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/types";
import BlocksContext from "@/context/blocks-provider/blocks";
import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";
import BlockSelectContext from "@/context/blockSelect";
import {
  BlockTreeContext,
  type BlockTree,
  type BlockTreeEventMap,
  type BlockTreeProps,
} from "@/context/blockTree";
import { useEventBus } from "@/plugins/eventbus";
import { getDefaultDiGenerator, type DisplayItem } from "@/utils/display-item";
import { getHoveredElementWithClass, inViewport } from "@/utils/dom";
import mitt from "@/utils/mitt";
import { EditorView as CmEditorView } from "@codemirror/view";
import { useThrottleFn } from "@vueuse/core";
import { AllSelection } from "prosemirror-state";
import { EditorView as PmEditorView } from "prosemirror-view";
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { VirtList } from "vue-virt-list";
import BasicBlockItem from "./display-items/BasicBlockItem.vue";
import { timeout } from "@/utils/time";
import BacklinksBlockItem from "./display-items/BacklinksBlockItem.vue";
import BacklinksHeaderItem from "./display-items/BacklinksHeaderItem.vue";
import PotentialLinksBlockItem from "./display-items/PotentialLinksBlockItem.vue";
import PotentialLinksHeaderItem from "./display-items/PotentialLinksHeaderItem.vue";

const props = defineProps<BlockTreeProps>();
const eventBus = useEventBus();
const blockTreeContext = BlockTreeContext.useContext();
const { blocksManager, blockEditor } = BlocksContext.useContext();
const blockSelectContext = BlockSelectContext.useContext();
const $blockTree = ref<HTMLElement | null>(null);
const $vlist = ref<InstanceType<typeof VirtList> | null>(null);
const displayItems = shallowRef<DisplayItem[]>();
const localEventBus = mitt<BlockTreeEventMap>();
const changeRef = eventBus.eventRefs.afterBlocksTrCommit;
const editorViews = new Map<BlockId, PmEditorView | CmEditorView>();
let fixedOffset: number | null = null;
// 在设置了 forceFold 时，仍展开显示的所有块
const tempExpanded = ref(new Set<BlockId>());

const updateDisplayItems = () => {
  const diGenerator = props.diGenerator ?? getDefaultDiGenerator(blocksManager, true); // TODO

  // 计算 displayItems
  const blockTreeId = props.id;
  console.time(`calc displayItems ${blockTreeId}`);
  displayItems.value = diGenerator({
    rootBlockIds: props.rootBlockIds,
    rootBlockLevel: props.rootBlockLevel,
    forceFold: props.forceFold,
    tempExpanded: tempExpanded.value,
  });
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
    if (itemI.type == "basic-block" && itemI.block.id == blockId) {
      for (let j = i - 1; j >= 0; j--) {
        const itemJ = displayItems.value![j];
        if (itemJ.type == "basic-block") {
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
    if (itemI.type == "basic-block" && itemI.block.id == blockId) {
      for (let j = i + 1; j < displayItems.value!.length; j++) {
        const itemJ = displayItems.value![j];
        if (itemJ.type == "basic-block") {
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
  const blockDom = getDomOfDi(`block-${blockId}`);
  // 如果已经在视口内，则不滚动
  if (blockDom && inViewport(blockDom)) return;
  // 滚动到该块
  const index = displayItems.value!.findIndex(
    (item) => item.type == "basic-block" && item.block.id == blockId,
  );
  if (index != null && index >= 0) {
    const pos = $vlist.value?.getItemPosByIndex(index);
    if (pos) {
      const { top } = pos;
      $vlist.value?.scrollToOffset(top - 60); // 60 是 headerbar 的高度多一点
    }
  }
};

const getDomOfDi = (itemId: string): HTMLElement | null => {
  return $blockTree.value?.querySelector(`[data-id="${itemId}"]`) ?? null;
};

const focusBlock = async (
  blockId: BlockId,
  options: {
    scrollIntoView?: boolean;
    highlight?: boolean;
    expandIfFold?: boolean;
  } = {},
) => {
  let { scrollIntoView, highlight, expandIfFold } = options;
  scrollIntoView ??= true;
  highlight ??= false;
  expandIfFold ??= false;

  // 如果 expandIfFold，则先展开这个块
  if (expandIfFold) {
    await blockEditor.locateBlock(blockId, controller);
  }

  // 确保这个块在视口中
  scrollIntoView && scrollBlockIntoView(blockId);

  await timeout(0); // 等待渲染完毕

  // 聚焦到文本或代码块
  getEditorView(blockId)?.focus();

  const $diEl = getDomOfDi(`block-${blockId}`)?.querySelector(".block-item");
  if (!$diEl) return;

  // 点击公式块以聚焦到公式
  const $mathContentEl = $diEl.querySelector(".math-content");
  if ($mathContentEl instanceof HTMLElement) {
    $mathContentEl.click();
  }

  // 聚焦到图片块
  const $cursorContainerEl = $diEl.querySelector(".cursor-container");
  if ($cursorContainerEl instanceof HTMLElement) {
    $cursorContainerEl.focus();
  }

  if (highlight) {
    // 0-1000ms 高亮，1000-3000ms 淡化，3000ms 后移除高亮
    $diEl.classList.add("highlight-keep");
    setTimeout(() => {
      $diEl.classList.add("highlight-fade");
    }, 1000);
    setTimeout(() => {
      $diEl.classList.remove("highlight-keep");
      $diEl.classList.remove("highlight-fade");
    }, 3000);
  }
};

const moveCursorToTheEnd = (blockId: BlockId) => {
  const editorView = getEditorView(blockId);
  if (editorView instanceof PmEditorView) {
    const tr = editorView.state.tr;
    const sel = AllSelection.atEnd(editorView.state.doc);
    tr.setSelection(sel);
    editorView.dispatch(tr);
  } else if (editorView instanceof CmEditorView) {
    const sel = editorView.state.doc.length;
    editorView.dispatch({
      selection: { anchor: sel },
    });
  }
};

const moveCursorToBegin = (blockId: BlockId) => {
  const editorView = getEditorView(blockId);
  if (editorView instanceof PmEditorView) {
    const tr = editorView.state.tr;
    const sel = AllSelection.atStart(editorView.state.doc);
    tr.setSelection(sel);
    editorView.dispatch(tr);
  } else if (editorView instanceof CmEditorView) {
    editorView.dispatch({
      selection: { anchor: 0 },
    });
  }
};

// 获得包含有一个块的“最外层”的 DisplayItem
const findBelongingDi = (blockId: BlockId): DisplayItem | null => {
  if (!displayItems.value) return null;
  for (const item of displayItems.value) {
    if (item.type == "basic-block" && item.block.id == blockId) {
      return item;
    }
  }
  return null;
};

// 获得包含有一个块的“最外层”的 DisplayItem 的 index
const indexOfBelongingDi = (blockId: BlockId): number => {
  if (!displayItems.value) return -1;
  for (let i = 0; i < displayItems.value.length; i++) {
    const item = displayItems.value[i];
    if (item.type == "basic-block" && item.block.id == blockId) {
      return i;
    }
  }
  return -1;
};

const registerEditorView = (blockId: BlockId, editorView: PmEditorView | CmEditorView) => {
  editorViews.set(blockId, editorView);
};

const unregisterEditorView = (blockId: BlockId, editorView: PmEditorView | CmEditorView) => {
  const oldEditorView = editorViews.get(blockId);
  if (oldEditorView === editorView && !oldEditorView.dom.isConnected) {
    editorViews.delete(blockId);
  }
};

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
  registerEditorView,
  unregisterEditorView,
  localEventBus,
  nextUpdate,
  getEditorView,
  focusBlock,
  getDomOfDi,
  moveCursorToTheEnd,
  moveCursorToBegin,
};
defineExpose(controller);

// 块拖动和框选
let blockIdStart: BlockId | null = null;
let startTime: number | null = null;

const handlePointerUpOrLeave = (e: PointerEvent) => {
  blockIdStart = null;
  startTime = null;
  document.removeEventListener("pointermove", handlePointerMove);
  document.removeEventListener("pointerup", handlePointerUpOrLeave);
  document.removeEventListener("pointerleave", handlePointerUpOrLeave);
};

const handlePointerMove = useThrottleFn((e: PointerEvent) => {
  // 如果按下时间小于 500ms，则认为是点击，不认为是框选
  // 防止影响双击选词的功能
  const duration = Date.now().valueOf() - (startTime ?? 0);
  if (duration < 500) return;

  const hoveredBlockItem = getHoveredElementWithClass(e.target, "block-item");
  if (!hoveredBlockItem) return;
  const blockIdCurrent = hoveredBlockItem.getAttribute("blockId");
  if (!blockIdCurrent || blockIdStart == null) return;
  // 如果点击的是同一个块，则取消选中，并聚焦到这个块，以框选其中的文字
  if (blockIdStart == blockIdCurrent) {
    blockSelectContext.selectedBlockIds.value = [];
    blockSelectContext.selectedBlockTree.value = null;
    focusBlock(blockIdCurrent, { scrollIntoView: false });
    return;
  }
  // 框选区域：blockIdStart 到 blockIdCurrent
  (document.activeElement as HTMLElement)?.blur(); // 先让当前聚焦的块失焦
  // 计算选中的块
  const _indexStart = indexOfBelongingDi(blockIdStart);
  const _indexEnd = indexOfBelongingDi(blockIdCurrent);
  if (_indexStart == -1 || _indexEnd == -1) return;
  const indexStart = Math.min(_indexStart, _indexEnd);
  const indexEnd = Math.max(_indexStart, _indexEnd);
  const selectedDis = displayItems.value!.slice(indexStart, indexEnd + 1);
  const selectedBlockIds = selectedDis.map((item) => item.block.id);
  // 更新 blockSelectContext
  blockSelectContext.selectedBlockIds.value = selectedBlockIds;
  blockSelectContext.selectedBlockTree.value = props.id;
}, 100);

const handlePointerDown = (e: PointerEvent) => {
  const hoveredBlockContent = getHoveredElementWithClass(e.target, "block-content");
  const hoveredBlockItem = getHoveredElementWithClass(e.target, "block-item");
  if (!hoveredBlockContent || !hoveredBlockItem) return;
  const blockId = hoveredBlockItem.getAttribute("blockId");
  if (!blockId) return;
  blockIdStart = blockId;
  startTime = Date.now().valueOf();

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUpOrLeave);
  document.addEventListener("pointerleave", handlePointerUpOrLeave);
};

onMounted(() => {
  const el = $blockTree.value;
  if (el) Object.assign(el, { controller });
  blockTreeContext.registerBlockTree(controller);
});

onUnmounted(() => {
  blockTreeContext.unregisterBlockTree(props.id);
});
</script>

<style lang="scss">
.block-tree {
  position: relative;

  // 用 footer 遮挡掉不想看到的缩进线
  .vlist {
    [data-id="footer"] {
      flex-grow: 1;
      flex-shrink: 0;
      min-height: var(--padding-bottom);
      background-color: var(--bg-color-primary);
      position: relative;
      z-index: 99;
    }

    [data-id="header"] {
      min-height: var(--padding-top);
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
  background-color: var(--highlight-text-bg);
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
