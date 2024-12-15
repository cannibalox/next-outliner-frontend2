<template>
  <div
    class="block-item"
    :class="{ hasChildren, fold, selected }"
    :blockId="block.id"
    @focusin="handleFocusIn"
  >
    <div class="indent-lines">
      <div class="indent-line" v-for="i in level" :key="i"></div>
    </div>
    <div class="relative block-content-container">
      <div class="block-buttons">
        <BlockContextMenu :block-id="block.id">
          <div class="more-button">
            <MoreHorizontal />
          </div>
        </BlockContextMenu>
        <div class="fold-button" v-if="!hideFoldButton" @click="handleClickFoldButton">
          <Triangle></Triangle>
        </div>
      </div>

      <div class="bullet shrink-0" v-if="!hideBullet" draggable="true" @click="handleClickBullet">
        <Diamond class="diamond" v-if="hasOrIsMirrors" />
        <Circle class="circle" v-else />
      </div>

      <BlockContent
        :block="block"
        :block-tree="blockTree"
        :readonly="readonly"
        :highlight-terms="highlightTerms"
        :highlight-refs="highlightRefs"
      ></BlockContent>

      <BacklinksCounter :block-id="block.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/types";
import BlocksContext from "@/context/blocks-provider/blocks";
import BlockSelectContext from "@/context/blockSelect";
import type { BlockTree } from "@/context/blockTree";
import LastFocusContext from "@/context/lastFocus";
import MainTreeContext from "@/context/mainTree";
import { useTaskQueue } from "@/plugins/taskQueue";
import { Circle, Diamond, MoreHorizontal, Triangle } from "lucide-vue-next";
import { computed } from "vue";

import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";
import BlockContent from "../block-contents/BlockContent.vue";
import BlockContextMenu from "../contextmenu/BlockContextMenu.vue";
import IndexContext from "@/context";
import BacklinksCounter from "../backlinks-counter/BacklinksCounter.vue";

const props = defineProps<{
  blockTree?: BlockTree;
  block: Block;
  level: number;
  hideFoldButton?: boolean;
  hideBullet?: boolean;
  forceFold?: boolean;
  showPath?: boolean;
  readonly?: boolean;
  highlightTerms?: string[];
  highlightRefs?: BlockId[];
}>();

const taskQueue = useTaskQueue();
const { blocksManager, blockEditor } = BlocksContext.useContext();
const { lastFocusedBlockId, lastFocusedBlockTreeId } = LastFocusContext.useContext();
const { mainRootBlockId } = MainTreeContext.useContext();
const { selectedBlockIds, selectedBlockTree } = BlockSelectContext.useContext();
const { backlinksIndex, getMirrors } = IndexContext.useContext();

// computed
const mirrorIds = computed(() => getMirrors(props.block.id));
const hasOrIsMirrors = computed(
  () => mirrorIds.value.size > 0 || props.block.type === "mirrorBlock",
);
const fold = computed(() => props.block.fold);
const hasChildren = computed(() => props.block.childrenIds.length > 0);
const selected = computed(() => selectedBlockIds.value.includes(props.block.id));
const backlinks = computed(() => backlinksIndex.value[props.block.id] ?? new Set());

// handlers
const handleFocusIn = () => {
  const blockId = props.block.id;
  const blockTreeId = props.blockTree?.getId() ?? null;
  lastFocusedBlockId.value = blockId;
  lastFocusedBlockTreeId.value = blockTreeId;
  // 一个块获得焦点时，清除块选择
  selectedBlockIds.value = [];
  selectedBlockTree.value = null;
};

const handleClickFoldButton = () => {
  const blockId = props.block.id;
  taskQueue.addTask(() => blockEditor.toggleFold(blockId));
};

const handleClickBullet = () => {
  mainRootBlockId.value = props.block.id;
};
</script>

<style lang="scss">
.block-item {
  position: relative;
  display: flex;

  &.selected {
    .block-content,
    .bullet {
      background-color: hsl(var(--muted));
    }
  }

  .indent-lines {
    display: flex;

    .indent-line {
      width: calc(var(--block-indent-width) - var(--block-indent-adjust));
      height: 100%;
      border-right: var(--border-indent);
      margin-right: var(--block-indent-adjust);
      border-right: 1px solid var(--indent-line-color);
    }
  }

  .bullet {
    height: calc(var(--editor-line-height) + var(--content-padding));
    min-width: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-right: 6px;
    cursor: grab;
    background-color: var(--bg-color-primary);

    .no {
      float: right;
      width: fit-content;
      margin-right: 2px;
    }

    svg {
      height: var(--bullet-size);
      width: var(--bullet-size);
      stroke: none;
      fill: var(--bullet-color);
      padding: 4px;

      &.diamond {
        width: 15px;
        height: 15px;
      }
    }

    // 如果一个折叠的块
    // 1. 有孩子
    // 2. 有反链
    // 3. 有元数据
    // 总之就是可以展开，则 bullet 外面加一圈浅色
    @at-root .block-item.fold.hasChildren .bullet svg,
      .block-item.fold.hasBacklink .bullet svg,
      .block-item.fold.hasMetadata .bullet svg {
      background-color: var(--bullet-background);
      border-radius: 8px;
    }
  }

  .block-content-container {
    display: flex;
    flex-grow: 1;
    padding-left: 18px;

    .block-buttons {
      position: absolute;
      left: -22px;
      width: 36px;
      display: flex;
      justify-content: flex-end;

      .more-button {
        height: calc(var(--editor-line-height) + var(--content-padding));
        width: 18px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        flex-shrink: 0;
        margin-right: 4px;
        display: none; // 默认隐藏 more button

        svg {
          stroke: var(--block-button-color);
        }

        // 如果 hover，则显示 more button
        @at-root .block-item:hover > .block-content-container > .block-buttons .more-button {
          display: flex;
        }
      }

      .fold-button {
        height: calc(var(--editor-line-height) + var(--content-padding));
        width: 18px;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        display: none; // 默认隐藏 fold button

        // 如果：
        // 1. 这个 block 有 children，且 hover
        // 2. 这个 block 有 backlink，且 hover
        // 3. 这个 block 有编号
        // 4. 这个 block 有 metadata，且 hover
        // 则显示 fold button
        @at-root .block-item.hasChildren:hover
            > .block-content-container
            > .block-buttons
            > .fold-button,
          .block-item.hasBacklink:hover > .block-content-container > .block-buttons > .fold-button,
          .block-item.hasChildren.no > .block-content-container > .block-buttons > .fold-button,
          .block-item.hasMetadata:hover > .block-content-container > .block-buttons > .fold-button {
          display: flex;
        }

        svg {
          height: var(--fold-button-size);
          width: var(--fold-button-size);
          stroke: none;
          fill: var(--block-button-color);
          transform: rotate(180deg);
          padding: 4px;
        }

        // 如果这个 block 是 folded 的，则将 fold button 旋转 90 度
        @at-root .block-item.fold > .block-content-container > .block-buttons > .fold-button svg {
          transform: rotate(90deg);
        }
      }
    }
  }

  .block-content {
    flex-grow: 1;
    width: min-content;
    background-color: var(--bg-color-primary);
  }

  .unsupported-block-content {
    background-color: var(--bg-color-primary);
    flex-grow: 1;
    color: red;
  }

  & > .block-content-container > .block-content:has(.tag[ctext~="later"]),
  & > .block-content-container > .block-content:has(.tag[ctext~="abort"]) {
    color: hsl(var(--muted-foreground));
  }

  & > .block-content-container > .block-content:has(.tag[ctext~="done"]) {
    color: hsl(var(--muted-foreground));
    text-decoration-line: line-through;
    text-decoration-thickness: 1px;
  }

  ///// 标签颜色
  .tag[ctext~="today"] {
    background-color: var(--highlight-3);
    color: var(--text-primary-color);
  }

  .tag[ctext~="later"] {
    background-color: var(--highlight-1);
    color: var(--text-primary-color);
  }

  .tag[ctext~="done"] {
    background-color: var(--highlight-2);
    color: var(--text-primary-color);
  }

  .tag[ctext~="ongoing"] {
    background-color: var(--highlight-4);
    color: var(--text-primary-color);
  }

  &.paragraph {
    .block-content {
      padding-top: 0.2em;
      padding-bottom: 0.2em;
    }

    .bullet {
      opacity: 0;
    }
  }
}

.drop-area {
  background-color: var(--drop-area-bg);
  height: 2px;
  margin: 1px 4px 1px;
  border-radius: 4px;
}
</style>
