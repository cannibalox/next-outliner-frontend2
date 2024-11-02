<template>
  <div
    class="block-content image-content"
    :data-showDropdown="showDropdown"
    v-if="block.content[0] === BLOCK_CONTENT_TYPES.IMAGE && image"
  >
    <div v-if="image.status === 'fetching'" class="flex items-center text-muted-foreground">
      <Loader2 class="size-4 mr-2 animate-spin" />
      {{ $t("kbView.imageContent.fetchingImage") }}
    </div>
    <div
      v-else-if="image.status === 'synced'"
      class="image-container select-none my-2"
      :class="{
        imageBlend: props.block.content[5]?.includes('blend'),
        imageCircle: props.block.content[5]?.includes('circle'),
        imageInvert: props.block.content[5]?.includes('invert'),
        imageInvertW: props.block.content[5]?.includes('invertW'),
        imageOutline: props.block.content[5]?.includes('outline'),
      }"
      ref="imageElContainerRef"
    >
      <div class="image-fit-container relative w-fit bg-background">
        <img
          ref="imageElRef"
          class="rounded"
          :style="{
            width: block.content[4] ? block.content[4] + 'px' : 'unset',
          }"
          :src="image.url"
        />

        <div
          class="absolute right-[2px] top-1/2 -translate-y-1/2 h-full max-h-[40px] rounded w-1 bg-muted cursor-col-resize"
          @mousedown="handleMouseDown"
        ></div>

        <DropdownMenu v-model:open="showDropdown" :modal="false">
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon" class="image-actions absolute top-2 right-2">
              <MoreVertical class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-52 mx-4">
            <DropdownMenuItem>
              <MessageSquareMore class="size-4 mr-2" />
              {{ $t("kbView.imageContent.addCaption") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('blend'),
              }"
              @click="toggleFilter('blend')"
            >
              <Blend class="size-4 mr-2" />
              {{ $t("kbView.imageContent.blend") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('circle'),
              }"
              @click="toggleFilter('circle')"
            >
              <Crop class="size-4 mr-2" />
              {{ $t("kbView.imageContent.circle") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('invert'),
              }"
              @click="toggleFilter('invert')"
            >
              <Moon class="size-4 mr-2" />
              {{ $t("kbView.imageContent.invert") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('invertW'),
              }"
              @click="toggleFilter('invertW')"
            >
              <Sun class="size-4 mr-2" />
              {{ $t("kbView.imageContent.invertW") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('outline'),
              }"
              @click="toggleFilter('outline')"
            >
              <Square class="size-4 mr-2" />
              {{ $t("kbView.imageContent.outline") }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="{
                active: isFilterActive('outline'),
              }"
              class="!text-red-500"
              @click="handleDeleteImage"
            >
              <Trash2 class="size-4 mr-2" />
              {{ $t("kbView.imageContent.deleteImage") }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { Button } from "@/components/ui/button";
import type { BlockWithLevel } from "@/context/blocks-provider/blocksManager";
import type { BlockTree } from "@/context/blockTree";
import ImagesContext, { type ImageState } from "@/context/images";
import {
  Blend,
  Crop,
  Expand,
  Loader2,
  MessageSquareMore,
  Moon,
  MoreVertical,
  Square,
  Sun,
  Trash2,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTaskQueue } from "@/plugins/taskQueue";
import BlocksContext from "@/context/blocks-provider/blocks";
import type { ImageContent } from "@/common/types";
import { watch } from "vue";
import { syncRef } from "@vueuse/core";

const props = defineProps<{
  blockTree?: BlockTree;
  block: BlockWithLevel;
}>();

const { useImage } = ImagesContext.useContext();
const imageElRef = ref<HTMLImageElement | null>(null);
const imageElContainerRef = ref<HTMLDivElement | null>(null);
const taskQueue = useTaskQueue();
const { blockEditor } = BlocksContext.useContext();
let imageLeft = 0; // 拖曳开始时，记录图片左侧的位置，用于计算宽度

const image = ref<ImageState | null>(null);
watch(
  () => props.block.id,
  () => {
    const image2 = useImage(props.block.content[1]);
    syncRef(image, image2, { direction: "rtl" }); // image <= image2
  },
  { immediate: true },
);

const showDropdown = ref(false);

const adjustWider = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const imageEl = imageElRef.value;
  const imageElContainer = imageElContainerRef.value;
  if (!imageEl || !imageElContainer) return;
  const defaultWidth = Math.min(imageElContainer.clientWidth, imageEl.naturalWidth);
  const nowWidth = (props.block.content[4] ?? defaultWidth) as number;
  const newWidth = nowWidth * 1.1;
  taskQueue.addTask(() => {
    const blockId = props.block.id;
    const newContent = [...props.block.content] as ImageContent;
    newContent[4] = newWidth;
    blockEditor.changeBlockContent(blockId, newContent);
  });
};

const adjustNarrower = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const imageEl = imageElRef.value;
  const imageElContainer = imageElContainerRef.value;
  if (!imageEl || !imageElContainer) return;
  const defaultWidth = Math.min(imageElContainer.clientWidth, imageEl.naturalWidth);
  const nowWidth = (props.block.content[4] ?? defaultWidth) as number;
  const newWidth = nowWidth * 0.9;
  taskQueue.addTask(() => {
    const blockId = props.block.id;
    const newContent = [...props.block.content] as ImageContent;
    newContent[4] = newWidth;
    blockEditor.changeBlockContent(blockId, newContent);
  });
};

const resetWidth = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  taskQueue.addTask(() => {
    const blockId = props.block.id;
    const newContent = [...props.block.content] as ImageContent;
    newContent[4] = null;
    blockEditor.changeBlockContent(blockId, newContent);
  });
};

const toggleFilter = (filter: "blend" | "circle" | "invert" | "invertW" | "outline") => {
  taskQueue.addTask(() => {
    const blockId = props.block.id;
    const newContent = [...props.block.content] as ImageContent;
    const newFilters = newContent[5] ?? [];
    if (newFilters.includes(filter)) {
      newFilters.splice(newFilters.indexOf(filter), 1);
    } else {
      newFilters.push(filter);
    }
    newContent[5] = newFilters;
    blockEditor.changeBlockContent(blockId, newContent);
  });
};

const isFilterActive = (filter: "blend" | "circle" | "invert" | "invertW" | "outline") => {
  const filters = props.block.content[5] ?? [];
  return filters.includes(filter);
};

const handleDeleteImage = () => {
  taskQueue.addTask(() => {
    blockEditor.deleteBlock(props.block.id);
  });
};

const handleMouseMove = (e: MouseEvent) => {
  const newWidth = e.clientX - imageLeft + 3;
  // 更新图片宽度
  // 注意，此时直接修改 img 的 width，而不是修改 blockContent
  // 等拖曳完成后，再修改 blockContent
  const imageEl = imageElRef.value;
  if (!imageEl) return;
  imageEl.style.width = Math.min(imageEl.naturalWidth, newWidth) + "px";
};

const handleMouseUpOrLeave = () => {
  // 拖曳结束
  const imageEl = imageElRef.value;
  if (!imageEl) return;
  const newWidth = imageEl.clientWidth;
  taskQueue.addTask(() => {
    const blockId = props.block.id;
    const newContent = [...props.block.content] as ImageContent;
    newContent[4] = newWidth;
    blockEditor.changeBlockContent(blockId, newContent);
  });

  // 恢复全局 cursor 样式
  document.getElementById("cursor-style")?.remove();

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUpOrLeave);
  document.removeEventListener("mouseleave", handleMouseUpOrLeave);
};

const handleMouseDown = (e: MouseEvent) => {
  // 记录图片左侧的位置，用于计算宽度
  const imageEl = imageElRef.value;
  const rect = imageEl?.getBoundingClientRect();
  if (!rect) return;
  imageLeft = rect.left;

  // 修改全局 cursor 样式
  // 参考：https://stackoverflow.com/questions/10750582/global-override-of-mouse-cursor-with-javascript
  const cursorStyle = document.createElement("style");
  cursorStyle.innerHTML = "*{cursor: col-resize!important;}";
  cursorStyle.id = "cursor-style";
  document.head.appendChild(cursorStyle);

  e.preventDefault();
  e.stopPropagation();
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUpOrLeave);
  document.addEventListener("mouseleave", handleMouseUpOrLeave);
};
</script>

<style lang="scss">
// hover 在图片上，或者 dropdown 打开时，显示按钮
.block-content {
  .image-actions {
    opacity: 0;
    transition: opacity 200ms var(--tf);
  }

  .image-fit-container:hover .image-actions {
    opacity: 1;
  }

  &[data-showDropdown="true"] .image-actions {
    opacity: 1;
  }
}

// Filters
.block-content .imageBlend img {
  mix-blend-mode: screen;
}

.dark .block-content .imageInvert img {
  filter: invert(1) hue-rotate(180deg);
  mix-blend-mode: screen;
}

.light .block-content .imageInvertW img {
  filter: invert(1) hue-rotate(180deg);
  mix-blend-mode: multiply;
}

// 激活的 dropdown-menu-item
.dropdown-menu-item.active {
  background-color: hsl(var(--muted));
}
</style>
