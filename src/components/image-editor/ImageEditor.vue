<template>
  <Dialog v-model:open="open">
    <DialogContent class="select-none">
      <DialogHeader>
        <DialogTitle>{{ $t("kbView.imageEditor.title") }}</DialogTitle>
        <DialogDescription>{{ $t("kbView.imageEditor.description") }}</DialogDescription>
      </DialogHeader>

      <!-- toolbar -->
      <div class="flex items-center justify-between">
        <div></div>
        <div></div>
      </div>

      <!-- image -->
      <div v-if="imageUrl" class="relative image-editor--container">
        <img :src="imageUrl" class="image-editor--image pointer-events-none" />
        <div
          class="absolute bg-black/50 cursor-move image-editor--rect"
          :style="{
            top: `${topOffset}px`,
            left: `${leftOffset}px`,
            height: `${height}px`,
            width: `${width}px`,
          }"
          @pointerdown="rectPointerDownHandler"
        >
          <div class="relative w-full h-full">
            <div
              class="left-handle rounded cursor-ew-resize absolute top-0 left-0 w-2 h-1/2 translate-y-1/2 -translate-x-1 bg-muted border-[1px] border-muted-foreground/50"
              @pointerdown.stop="handlePointerDownHandler('left')($event)"
            ></div>
            <div
              class="right-handle rounded cursor-ew-resize absolute top-0 right-0 w-2 h-1/2 translate-y-1/2 translate-x-1 bg-muted border-[1px] border-muted-foreground/50"
              @pointerdown.stop="handlePointerDownHandler('right')($event)"
            ></div>
            <div
              class="top-handle rounded cursor-ns-resize absolute top-0 left-0 w-1/2 h-2 translate-x-1/2 -translate-y-1 bg-muted border-[1px] border-muted-foreground/50"
              @pointerdown.stop="handlePointerDownHandler('top')($event)"
            ></div>
            <div
              class="bottom-handle rounded cursor-ns-resize absolute bottom-0 left-0 w-1/2 h-2 translate-y-1 translate-x-1/2 bg-muted border-[1px] border-muted-foreground/50"
              @pointerdown.stop="handlePointerDownHandler('bottom')($event)"
            ></div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <Label>{{ $t("kbView.imageEditor.deleteOriginal") }}</Label>
            <Checkbox v-model="deleteOriginal" />
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline">{{ $t("kbView.imageEditor.cancel") }}</Button>
            <Button variant="outline">{{ $t("kbView.imageEditor.saveAs") }}</Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ImageEditorContext from "@/context/imageEditor";
import { ref } from "vue";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { createPromise } from "@/utils/promise";

const { open, imageUrl, deleteOriginal } = ImageEditorContext.useContext()!;
const leftOffset = ref(0);
const topOffset = ref(0);
const width = ref(200);
const height = ref(200);

// 处理矩形框的拖动
let rectMoveCtx: {
  initPointerX: number; // 鼠标按下时的 x 坐标
  initPointerY: number; // 鼠标按下时的 y 坐标
  initRectTop: number; // 此时矩形框的 top 坐标
  initRectLeft: number; // 此时矩形框的 left 坐标
  imageWidth: number; // 图片的宽度
  imageHeight: number; // 图片的高度
  rectWidth: number; // 矩形框的宽度
  rectHeight: number; // 矩形框的高度
} | null = null;
const rectPointerDownHandler = (event: PointerEvent) => {
  window.addEventListener("pointermove", rectPointerMoveHandler);
  window.addEventListener("pointerup", rectPointerUpLeaveHandler);
  window.addEventListener("pointerleave", rectPointerUpLeaveHandler);
  const containerRect = document.querySelector(".image-editor--container");
  const rectRect = document.querySelector(".image-editor--rect");
  if (!containerRect || !rectRect) return;
  rectMoveCtx = {
    initPointerX: event.clientX,
    initPointerY: event.clientY,
    initRectTop: topOffset.value,
    initRectLeft: leftOffset.value,
    imageWidth: containerRect.clientWidth,
    imageHeight: containerRect.clientHeight,
    rectWidth: rectRect.clientWidth,
    rectHeight: rectRect.clientHeight,
  };
};

const rectPointerMoveHandler = (event: PointerEvent) => {
  if (!rectMoveCtx) return;
  const deltaX = event.clientX - rectMoveCtx.initPointerX;
  const deltaY = event.clientY - rectMoveCtx.initPointerY;
  leftOffset.value = Math.min(
    Math.max(0, rectMoveCtx.initRectLeft + deltaX),
    rectMoveCtx.imageWidth - rectMoveCtx.rectWidth,
  );
  topOffset.value = Math.min(
    Math.max(0, rectMoveCtx.initRectTop + deltaY),
    rectMoveCtx.imageHeight - rectMoveCtx.rectHeight,
  );
};

const rectPointerUpLeaveHandler = (event: PointerEvent) => {
  window.removeEventListener("pointermove", rectPointerMoveHandler);
  window.removeEventListener("pointerup", rectPointerUpLeaveHandler);
  window.removeEventListener("pointerleave", rectPointerUpLeaveHandler);
  rectMoveCtx = null;
};

// 处理四个方向 handle 的拖动
let handleMoveCtx: {
  direction: "top" | "bottom" | "left" | "right";
  initPointerX: number; // 鼠标按下时的 x 坐标
  initPointerY: number; // 鼠标按下时的 y 坐标
  initRectTop: number; // 此时矩形框的 top 坐标
  initRectLeft: number; // 此时矩形框的 left 坐标
  imageWidth: number; // 图片的宽度
  imageHeight: number; // 图片的高度
  rectWidth: number; // 矩形框的宽度
  rectHeight: number; // 矩形框的高度
} | null = null;
const handlePointerDownHandler =
  (direction: "top" | "bottom" | "left" | "right") => (event: PointerEvent) => {
    window.addEventListener("pointermove", handlePointerMoveHandler);
    window.addEventListener("pointerup", handlePointerUpLeaveHandler);
    window.addEventListener("pointerleave", handlePointerUpLeaveHandler);
    const containerRect = document.querySelector(".image-editor--container");
    const rectRect = document.querySelector(".image-editor--rect");
    if (!containerRect || !rectRect) return;
    handleMoveCtx = {
      direction,
      initPointerX: event.clientX,
      initPointerY: event.clientY,
      initRectTop: topOffset.value,
      initRectLeft: leftOffset.value,
      imageWidth: containerRect.clientWidth,
      imageHeight: containerRect.clientHeight,
      rectWidth: rectRect.clientWidth,
      rectHeight: rectRect.clientHeight,
    };
    console.log(handleMoveCtx);
  };

const handlePointerMoveHandler = (event: PointerEvent) => {
  if (!handleMoveCtx) return;
  const deltaX = event.clientX - handleMoveCtx.initPointerX;
  const deltaY = event.clientY - handleMoveCtx.initPointerY;

  if (handleMoveCtx.direction === "top") {
    // 计算新的高度和顶部位置
    const newHeight = handleMoveCtx.rectHeight - deltaY;
    const newTop = handleMoveCtx.initRectTop + deltaY;

    // 确保高度不小于最小值且不超出图片边界
    if (newHeight >= 50 && newTop >= 0) {
      height.value = newHeight;
      topOffset.value = newTop;
    }
  } else if (handleMoveCtx.direction === "bottom") {
    // 计算新的高度
    const newHeight = handleMoveCtx.rectHeight + deltaY;

    // 确保高度不小于最小值且不超出图片底部
    if (newHeight >= 50 && topOffset.value + newHeight <= handleMoveCtx.imageHeight) {
      height.value = newHeight;
    }
  } else if (handleMoveCtx.direction === "left") {
    // 计算新的宽度和左侧位置
    const newWidth = handleMoveCtx.rectWidth - deltaX;
    const newLeft = handleMoveCtx.initRectLeft + deltaX;

    // 确保宽度不小于最小值且不超出图片边界
    if (newWidth >= 50 && newLeft >= 0) {
      width.value = newWidth;
      leftOffset.value = newLeft;
    }
  } else if (handleMoveCtx.direction === "right") {
    // 计算新的宽度
    const newWidth = handleMoveCtx.rectWidth + deltaX;

    // 确保宽度不小于最小值且不超出图片右侧
    if (newWidth >= 50 && leftOffset.value + newWidth <= handleMoveCtx.imageWidth) {
      width.value = newWidth;
    }
  }
};

const handlePointerUpLeaveHandler = (event: PointerEvent) => {
  window.removeEventListener("pointermove", handlePointerMoveHandler);
  window.removeEventListener("pointerup", handlePointerUpLeaveHandler);
  window.removeEventListener("pointerleave", handlePointerUpLeaveHandler);
  handleMoveCtx = null;
};
</script>
