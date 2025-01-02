<template>
  <div
    class="block-tree select-none"
    ref="$blockTree"
    :block-tree-id="id"
    :style="{
      '--padding-bottom': `${paddingBottom}px`,
      '--padding-top': `${paddingTop}px`,
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
        ></BasicBlockItem>
        <BacklinksHeaderItem
          v-if="itemData.type == 'backlink-header'"
          :key="itemData.blockId"
          :block-tree="controller"
          :block-id="itemData.blockId"
          :backlinks="itemData.backlinks"
        ></BacklinksHeaderItem>
        <BacklinksBlockItem
          v-if="itemData.type == 'backlink-block'"
          :key="itemData.block.id"
          :block-tree="controller"
          :block="itemData.block"
          :ref-block-id="itemData.refBlockId"
          :readonly="itemData.readonly"
          :highlight-terms="itemData.highlightTerms"
          :highlight-refs="itemData.highlightRefs"
        ></BacklinksBlockItem>
        <BacklinksDescendantItem
          v-if="itemData.type == 'backlink-descendant'"
          :key="itemData.block.id"
          :block-tree="controller"
          :block="itemData.block"
          :level="itemData.level"
          :readonly="itemData.readonly"
          :highlight-terms="itemData.highlightTerms"
          :highlight-refs="itemData.highlightRefs"
        ></BacklinksDescendantItem>
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
          :readonly="itemData.readonly"
          :highlight-terms="itemData.highlightTerms"
          :highlight-refs="itemData.highlightRefs"
        ></PotentialLinksBlockItem>
        <PotentialLinksDescendantItem
          v-if="itemData.type == 'potential-links-descendant'"
          :key="itemData.block.id"
          :block-tree="controller"
          :block="itemData.block"
          :level="itemData.level"
          :readonly="itemData.readonly"
          :highlight-terms="itemData.highlightTerms"
          :highlight-refs="itemData.highlightRefs"
        ></PotentialLinksDescendantItem>
        <MissingBlockItem
          v-if="itemData.type == 'missing-block'"
          :key="itemData.blockId"
          :block-id="itemData.blockId"
          :level="itemData.level"
        ></MissingBlockItem>
      </template>
      <template #footer> </template>
    </virt-list>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import BlocksContext from "@/context/blocks/blocks";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import BlockSelectDragContext from "@/context/blockSelect";
import {
  BlockTreeContext,
  type BlockTree,
  type BlockTreeEventMap,
  type BlockTreeProps,
} from "@/context/blockTree";
import { useEventBus } from "@/plugins/eventbus";
import {
  generateDisplayItems,
  isBlockDi,
  type DisplayBlockItem,
  type DisplayItem,
} from "@/utils/display-item";
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
import BacklinksDescendantItem from "./display-items/BacklinksDescendantItem.vue";
import PotentialLinksDescendantItem from "./display-items/PotentialLinksDescendantItem.vue";
import { clip } from "@/utils/popover";
import { useTaskQueue } from "@/plugins/taskQueue";
import MissingBlockItem from "./display-items/MissingBlockItem.vue";

const props = withDefaults(defineProps<BlockTreeProps>(), {
  virtual: true,
  showBacklinks: true,
  showPotentialLinks: true,
  paddingBottom: 200,
  paddingTop: 0,
});
const eventBus = useEventBus();
const blockTreeContext = BlockTreeContext.useContext();
const { blocksManager, blockEditor } = BlocksContext.useContext();
const blockSelectDragContext = BlockSelectDragContext.useContext();
const $blockTree = ref<HTMLElement | null>(null);
const $vlist = ref<InstanceType<typeof VirtList> | null>(null);
const displayItems = shallowRef<DisplayItem[]>();
const localEventBus = mitt<BlockTreeEventMap>();
const changeRef = eventBus.eventRefs.afterBlocksTrCommit;
const editorViews = new Map<BlockId, PmEditorView | CmEditorView>();
// 反链和潜在链接面板中所有被展开的块
// 由于反链和潜在链接面板中的块，默认都是折叠的，因此这里记录所有被展开的块更合适
const expandedBPBlockIds = ref<Record<BlockId, boolean>>({});
let fixedOffset: number | null = null;

const updateDisplayItems = () => {
  // 计算 displayItems
  const blockTreeId = props.id;
  console.time(`calc displayItems ${blockTreeId}`);
  displayItems.value = generateDisplayItems({
    rootBlockIds: props.rootBlockIds,
    rootBlockLevel: props.rootBlockLevel,
    blocksManager,
    showBacklinks: props.showBacklinks ?? true,
    showPotentialLinks: props.showPotentialLinks ?? true,
    expandedBPBlockIds: expandedBPBlockIds.value,
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

watch(expandedBPBlockIds, updateDisplayItems, { deep: true });
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
    if (isBlockDi(itemI)?.id == blockId) {
      for (let j = i - 1; j >= 0; j--) {
        const itemJ = displayItems.value![j];
        const block = isBlockDi(itemJ);
        if (block) return block;
      }
      return null;
    }
  }
  return null;
};

const getSuccessorBlock = (blockId: BlockId): Block | null => {
  for (let i = 0; i < displayItems.value!.length; i++) {
    const itemI = displayItems.value![i];
    if (isBlockDi(itemI)?.id == blockId) {
      for (let j = i + 1; j < displayItems.value!.length; j++) {
        const itemJ = displayItems.value![j];
        const block = isBlockDi(itemJ);
        if (block) return block;
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
  const index = displayItems.value!.findIndex((item) => isBlockDi(item)?.id == blockId);
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

const addToExpandedBPBlockIds = (blockId: BlockId) => {
  expandedBPBlockIds.value[blockId] = true;
};

const removeFromExpandedBPBlockIds = (blockId: BlockId) => {
  delete expandedBPBlockIds.value[blockId];
};

const getExpandedBPBlockIds = () => {
  return expandedBPBlockIds.value;
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
  addToExpandedBPBlockIds,
  removeFromExpandedBPBlockIds,
  getExpandedBPBlockIds,
};
defineExpose(controller);

let pointerDownBlockId: BlockId | null = null;
let pointerDownTime: number | null = null;
let dragging = false;

// 获得当前 blockTree 的缩进宽度
let indentSize: { width: number; rightMargin: number } | null = null;
const getIndentSize = () => {
  if (!indentSize) {
    const indentEl = $blockTree.value?.querySelector(".indent-line");
    if (indentEl) {
      const indentRightMargin = parseFloat(window.getComputedStyle(indentEl).marginRight);
      indentSize = {
        width: indentEl.clientWidth,
        rightMargin: indentRightMargin,
      };
    }
  }
  return indentSize!;
};

const handlePointerUpOrLeave = (e: PointerEvent) => {
  blockSelectDragContext.isDragSelecting.value = false;
  if (dragging) {
    const taskQueue = useTaskQueue();
    // 拖动结束，将选中的块移动到拖动结束的位置
    const draggingDropPos = blockSelectDragContext.draggingDropPos.value;
    if (!draggingDropPos) return;
    const { blockId, absLevel } = draggingDropPos;
    const selected = blockSelectDragContext.selectedBlockIds.value;
    const blockLevel = blocksManager.getBlockLevel(blockId);
    console.log("absLevel", absLevel, "blockLevel", blockLevel);
    if (absLevel > blockLevel) {
      // 将 selected 插入到 block 的子级
      taskQueue.addTask(() => {
        const pos = blockEditor.normalizePos({
          parentId: blockId,
          childIndex: "first",
        });
        if (!pos) return;
        blockEditor.moveBlocks({
          blockIds: selected.topLevelOnly,
          pos,
        });
      });
    } else {
      // 将 selected 插入到 block 的下方（与 block 同级）
      taskQueue.addTask(() => {
        const pos = blockEditor.normalizePos({
          baseBlockId: blockId,
          offset: 1,
        });
        if (!pos) return;
        blockEditor.moveBlocks({
          blockIds: selected.topLevelOnly,
          pos,
        });
      });
    }
  }

  pointerDownBlockId = null;
  pointerDownTime = null;
  dragging = false;
  blockSelectDragContext.draggingDropPos.value = null;
  document.removeEventListener("pointermove", handlePointerMove);
  document.removeEventListener("pointerup", handlePointerUpOrLeave);
  document.removeEventListener("pointerleave", handlePointerUpOrLeave);
};

const handlePointerMove = useThrottleFn((e: PointerEvent) => {
  if (dragging) {
    // 1. 拖动
    e.preventDefault();
    e.stopPropagation();
    const hoveredBlockItem = getHoveredElementWithClass(e.target, "block-item");
    const hoveredBlockId = hoveredBlockItem?.dataset["blockId"];
    // 指针悬停的块的缩进层级，相对于 rootBlockLevel
    const hoveredBlockLevel = parseInt(hoveredBlockItem?.dataset["blockLevel"]!);
    if (!hoveredBlockId) {
      blockSelectDragContext.draggingDropPos.value = null;
      return;
    }

    // 指针悬停处的缩进层级，相对 rootBlockLevel，不一定等于 hoveredBlockLevel！
    const { width, rightMargin } = getIndentSize();
    const pointerLevel = Math.floor((e.x + rightMargin) / (width + rightMargin));

    // 正在被拖曳的块
    const draggingBlocks = blockSelectDragContext.selectedBlockIds.value;

    // 判断是希望插到悬停的块上方还是下方
    const rect = hoveredBlockItem.getBoundingClientRect();
    const upperHalf = e.y < rect.y + rect.height / 2; // 光标悬停在块的上半部分还是下半部分
    if (upperHalf) {
      const predBlock = getPredecessorBlock(hoveredBlockId);
      if (!predBlock) return;
      const predPath = blocksManager.getBlockPath(predBlock.id);
      if (!predPath) return;
      const predLevel = predPath.length - 1 - props.rootBlockLevel;
      // 禁止将自己拖动到自己上
      for (const id of draggingBlocks.allNonFolded) {
        if (predPath.find((b) => b.id === id)) {
          blockSelectDragContext.draggingDropPos.value = null;
          return;
        }
      }
      const predFoldAndHasChild = predBlock.fold && predBlock.childrenIds.length > 0;

      const clippedLevel = clip(
        pointerLevel,
        // 如果 pred 折叠了，并且有孩子，则不允许拖成 pred 的子级
        predFoldAndHasChild ? predLevel : predLevel + 1,
        hoveredBlockLevel,
      );
      blockSelectDragContext.draggingDropPos.value = {
        blockId: predBlock.id,
        relIndent: clippedLevel * (width + rightMargin) + width,
        absLevel: clippedLevel + props.rootBlockLevel, // 加上 rootBlockLevel 才是绝对层级
      };
    } else {
      let clippedLevel;
      const succBlock = getSuccessorBlock(hoveredBlockId);
      const hoveredFoldAndHasChild =
        hoveredBlockItem.classList.contains("fold") &&
        hoveredBlockItem.classList.contains("hasChildren");
      if (!succBlock) {
        // 最后一个块
        clippedLevel = clip(
          pointerLevel,
          hoveredFoldAndHasChild ? hoveredBlockLevel : hoveredBlockLevel + 1,
          1,
        );
      } else {
        const succPath = blocksManager.getBlockPath(succBlock.id);
        if (!succPath) return;
        const succLevel = succPath.length - 1 - props.rootBlockLevel;
        clippedLevel = clip(
          pointerLevel,
          hoveredFoldAndHasChild ? hoveredBlockLevel : hoveredBlockLevel + 1,
          succLevel,
        );
      }
      blockSelectDragContext.draggingDropPos.value = {
        blockId: hoveredBlockId,
        relIndent: clippedLevel * (width + rightMargin) + width,
        absLevel: clippedLevel + props.rootBlockLevel, // 加上 rootBlockLevel 才是绝对层级
      };
    }
  } else {
    // 2. 框选
    // 如果按下时间小于 200ms，则认为是点击，不认为是框选
    // 防止影响双击选词的功能
    const duration = Date.now().valueOf() - (pointerDownTime ?? 0);
    if (duration < 200) return;

    e.preventDefault();
    e.stopPropagation();
    blockSelectDragContext.isDragSelecting.value = true;

    const hoveredBlockItem = getHoveredElementWithClass(e.target, "block-item");
    const blockIdCurrent = hoveredBlockItem?.dataset["blockId"];
    if (!blockIdCurrent || pointerDownBlockId == null) return;
    // 如果点击的是同一个块，则取消选中，并聚焦到这个块，以框选其中的文字
    if (pointerDownBlockId == blockIdCurrent) {
      blockSelectDragContext.selectedBlockIds.value = { topLevelOnly: [], allNonFolded: [] };
      focusBlock(blockIdCurrent, { scrollIntoView: false });
      return;
    }
    // 框选区域：blockIdStart 到 blockIdCurrent
    (document.activeElement as HTMLElement)?.blur(); // 先让当前聚焦的块失焦
    blockSelectDragContext.selectedBlockIds.value = { topLevelOnly: [], allNonFolded: [] };
    // 计算选中的块
    const startBlockPath = blocksManager.getBlockPath(pointerDownBlockId).map((b) => b.id);
    const currBlockPath = blocksManager.getBlockPath(blockIdCurrent).map((b) => b.id);
    let commonParentI = -1,
      commonParentJ = -1;
    for (let i = 0; i < startBlockPath.length; i++) {
      const indexJ = currBlockPath.indexOf(startBlockPath[i]);
      if (indexJ != -1) {
        commonParentI = i;
        commonParentJ = indexJ;
        break;
      }
    }
    if (commonParentI !== -1 && commonParentJ !== -1) {
      if (commonParentI === 0 || commonParentJ === 0) {
        const commonParentId = startBlockPath[commonParentI];
        const newSelected = {
          topLevelOnly: [commonParentId],
          allNonFolded: [] as BlockId[],
        };
        blocksManager.forDescendants({
          rootBlockId: commonParentId,
          rootBlockLevel: 0,
          nonFoldOnly: true,
          includeSelf: true,
          onEachBlock: (b) => {
            newSelected.allNonFolded.push(b.id);
          },
        });
        blockSelectDragContext.selectedBlockIds.value = newSelected;
      } else {
        const commonParentId = startBlockPath[commonParentI];
        const commonParentBlock = blocksManager.getBlock(commonParentId);
        if (!commonParentBlock) return;
        const childFrom = startBlockPath[commonParentI - 1];
        const childTo = currBlockPath[commonParentJ - 1];
        const childFromIndex = commonParentBlock.childrenIds.indexOf(childFrom);
        const childToIndex = commonParentBlock.childrenIds.indexOf(childTo);
        const from = Math.min(childFromIndex, childToIndex);
        const to = Math.max(childFromIndex, childToIndex);
        const newSelected = {
          topLevelOnly: commonParentBlock.childrenIds.slice(from, to + 1),
          allNonFolded: [] as BlockId[],
        };
        for (let i = from; i <= to; i++) {
          const childId = commonParentBlock.childrenIds[i];
          blocksManager.forDescendants({
            rootBlockId: childId,
            rootBlockLevel: 0,
            nonFoldOnly: true,
            includeSelf: true,
            onEachBlock: (b) => {
              newSelected.allNonFolded.push(b.id);
            },
          });
        }
        blockSelectDragContext.selectedBlockIds.value = newSelected;
      }
    }
  }
}, 100);

const handlePointerDown = (e: PointerEvent) => {
  const hoveredBlockItem = getHoveredElementWithClass(e.target, "block-item");
  if (!hoveredBlockItem) return;
  const blockId = hoveredBlockItem.dataset["blockId"];
  if (!blockId) return;
  pointerDownBlockId = blockId;
  pointerDownTime = Date.now().valueOf();
  blockSelectDragContext.isDragSelecting.value = false;
  // 如果按下的是块的 bullet，则认为是拖动，否则认为是框选
  const hoveredBullet = getHoveredElementWithClass(e.target, "bullet");
  if (hoveredBullet) {
    dragging = true;
    if (blockSelectDragContext.selectedBlockIds.value.topLevelOnly.length === 0) {
      const newSelected = {
        topLevelOnly: [blockId],
        allNonFolded: [] as BlockId[],
      };
      blocksManager.forDescendants({
        rootBlockId: blockId,
        rootBlockLevel: 0,
        nonFoldOnly: true,
        includeSelf: true,
        onEachBlock: (b) => {
          newSelected.allNonFolded.push(b.id);
        },
      });
      blockSelectDragContext.selectedBlockIds.value = newSelected;
    }
  }

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
