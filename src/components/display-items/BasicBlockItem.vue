<template>
  <div class="block-item"
    :class="{ hasChildren, fold }"
    :blockId="item.block.id"
    @focusin="handleFocusIn"
  >
  <div class="indent-lines">
      <div class="indent-line" v-for="i in block.level" :key="i"></div>
    </div>
    <div class="fold-button" v-if="!hideFoldButton" @click="handleClickFoldButton">
      <Triangle></Triangle>
    </div>
    <div class="bullet" v-if="!hideBullet" draggable="true">
      <Diamond class="diamond" v-if="mirrorIds.size > 0"></Diamond>
      <Circle class="circle" v-else></Circle>
    </div>
    <TextContent
      v-if="block.content[0] == BLOCK_CONTENT_TYPES.TEXT"
      :block="block"
      :block-tree="blockTree"
    ></TextContent>
  </div>
</template>

<script setup lang="ts">
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import TextContent from "@/components/block-contents/TextContent.vue";
import type { BlockTree } from "@/modules/blockTreeRegistry";
import type { DisplayItem } from "@/utils/display-item";
import { computed } from "vue";
import { Diamond, Circle, Triangle } from 'lucide-vue-next';
import { globalEnv } from "@/main";

const props = defineProps<{
  blockTree?: BlockTree;
  item: DisplayItem;
  hideFoldButton?: boolean;
  hideBullet?: boolean;
  forceFold?: boolean;
  showPath?: boolean;
}>();

const {blocksManager, globalUiVars, taskQueue, blockEditor} = globalEnv;

// computed
const block = computed(() => props.item.block);
const mirrorIds = computed(() => blocksManager.getMirrors(block.value.id));
const fold = computed(() => props.item.block.fold);
const hasChildren = computed(() => props.item.block.childrenIds.length > 0);

// handlers
const handleFocusIn = () => {
  const blockId = props.item.block.id;
  const blockTreeId = props.blockTree?.getId() ?? null;
  globalUiVars.lastFocusedBlockId.value = blockId;
  globalUiVars.lastFocusedBlockTreeId.value = blockTreeId;
};

const handleClickFoldButton = () => {
  const blockId = props.item.block.id;
  taskQueue.addTask(() => blockEditor.toggleFold(blockId));
}
</script>

<style lang="scss">
.block-item {
  position: relative;
  display: flex;

  &.selected {
    .block-content,
    .bullet {
      background-color: var(--muted);
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

  .fold-button {
    height: calc(26px + var(--content-padding));
    width: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    opacity: 0; // 默认隐藏 fold button

    // 如果：
    // 1. 这个 block 有 children，且 hover
    // 2. 这个 block 有 backlink，且 hover
    // 3. 这个 block 有编号
    // 4. 这个 block 有 metadata，且 hover
    // 则显示 fold button
    @at-root .block-item.hasChildren:hover > .fold-button,
      .block-item.hasBacklink:hover > .fold-button,
      .block-item.hasChildren.no > .fold-button,
      .block-item.hasMetadata:hover > .fold-button {
      opacity: 1;
    }

    svg {
      height: var(--fold-button-size);
      width: var(--fold-button-size);
      stroke: none;
      fill: var(--fold-button-color);
      transform: rotate(180deg);
      padding: 4px;
    }

    // 如果这个 block 是 folded 的，则将 fold button 旋转 90 度
    @at-root .block-item.fold > .fold-button svg {
      transform: rotate(90deg);
    }
  }

  .bullet {
    height: calc(26px + var(--content-padding));
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
        width: 8px;
        height: 8px;
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

  .block-content {
    flex-grow: 1;
    width: min-content;
    background-color: var(--bg-color-primary);

    // 直接改 .block-content 的 opacity 会导致 indent lines 透出来
    @at-root .block-item.completed .block-content .ProseMirror {
      opacity: 0.37;
      text-decoration-line: line-through;
      text-decoration-thickness: 1px;
    }
  }

  .unsupported-block-content {
    background-color: var(--bg-color-primary);
    flex-grow: 1;
    color: red;
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
