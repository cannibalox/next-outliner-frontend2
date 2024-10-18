<template>
  <div
    class="block-tree"
    ref="$blockTree"
    :block-tree-id="id"
    :style="{ '--padding-bottom': `${paddingBottom ?? 200}px` }"
  >
    <virt-list
      v-if="virtual"
      itemKey="id"
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
import type { BlockId } from "@/common/types";
import { globalEnv } from "@/main";
import type { BlockTree, BlockTreeEventMap, BlockTreeProps } from "@/modules/blockTreeRegistry";
import { defaultDiGenerator, type DisplayItem, type DisplayItemGenerator } from "@/utils/display-item";
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
const {eventBus, blockTreeRegistry} = globalEnv;
const localEventBus = mitt<BlockTreeEventMap>();
const blocksChangedRef = eventBus.eventRefs.blocksChanged;
const onceListeners = new Set<any>();
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

watch([
  () => props.rootBlockIds,
  blocksChangedRef
], updateDisplayItems, {
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

const getEditorView = (blockId: BlockId): PmEditorView | CmEditorView | null => {
  const $content = $blockTree.value?.querySelector(
    `.block-item[block-id="${blockId}"] .block-content`,
  ) as any;
  return $content?.pmView ?? $content?.cmView;
};

const controller: BlockTree = {
  getProps: () => props,
  getId: () => props.id,
  getDom: () => $blockTree.value!,
  getRootBlockIds: () => props.rootBlockIds ?? [],
  getDisplayItems: () => displayItems.value!,
  localEventBus,
  nextUpdate,
  getEditorView,
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