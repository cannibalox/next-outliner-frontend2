<template>
  <Popover v-model:open="open">
    <PopoverTrigger> </PopoverTrigger>
    <PopoverContent class="ref-suggestions-content p-2 pb-1"
      trap-focus tabindex="-1">
      <CodeMirror v-model:src="src" class="flex-grow" ref="codeMirror" :theme="theme" lang="latex"
        :extensions-generator="extensionsGenerator" :on-src-changed="onChange ?? undefined"></CodeMirror>
      <Label class="text-muted-foreground text-[.8em] font-normal text-right mr-2">Press "Esc" to close</Label>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import CodeMirror from "./codemirror/CodeMirror.vue";
import { EditorView, keymap } from "@codemirror/view";
import Label from "./ui/label/Label.vue";
import ThemeContext from "@/context/theme";
import FloatingMathInputContext from "@/context/floatingMathInput";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { calcPopoverPos } from "@/utils/popover";

const showPos = ref<{ x: number; y: number } | null>(null);
const open = computed({
  get: () => showPos.value !== null,
  set: (val) => !val && (showPos.value = null),
});
const src = ref("");
const codeMirror = ref<InstanceType<typeof CodeMirror> | null>(null);
const { theme } = ThemeContext.useContext();
const inputElInlineStyle = ref<string>("");
const { registerFloatingMathInput } = FloatingMathInputContext.useContext();

// context
let mathEl: HTMLElement | null = null; // 公式块
let onChange: ((value: string) => void) | null = null;
let onSkipLeft: (() => void) | null = null;
let onSkipRight: (() => void) | null = null;
let onDirectClose: (() => void) | null = null;
let onDeleteThisNode: (() => void) | null = null;


const extensionsGenerator = () => {
  return [
    EditorView.lineWrapping,
    keymap.of([
      {
        key: "Escape",
        run: () => {
          open.value = false;
          onDirectClose?.();
          return true;
        },
        stopPropagation: true,
      },
      {
        key: "ArrowLeft",
        run: () => {
          // 如果光标在开头，继续按左键跳出数学公式编辑器
          const view = codeMirror.value?.getEditorView();
          if (!view) return false;
          const sel = view.state.selection;
          if (sel.ranges.length === 1 && sel.ranges[0].empty && sel.ranges[0].anchor === 0) {
            open.value = false;
            onSkipLeft?.();
            return true;
          }
          return false;
        },
      },
      {
        key: "ArrowRight",
        run: () => {
          // 如果光标在结尾，继续按右键跳出数学公式编辑器
          const view = codeMirror.value?.getEditorView();
          if (!view) return false;
          const sel = view.state.selection;
          const docLen = view.state.doc.length;
          if (sel.ranges.length === 1 && sel.ranges[0].empty && sel.ranges[0].head === docLen) {
            open.value = false;
            onSkipRight?.();
            return true;
          }
          return false;
        },
      },
      {
        key: "Backspace",
        run: () => {
          // 如果输入框为空，继续按 Backspace 会删除当前节点
          const view = codeMirror.value?.getEditorView();
          if (!view) return false;
          if (view.state.doc.length === 0) {
            open.value = false;
            onDeleteThisNode?.();
            return true;
          }
          return false;
        },
      },
      {
        key: "Delete",
        run: () => {
          // 如果输入框为空，继续按 Delete 会删除当前节点
          const view = codeMirror.value?.getEditorView();
          if (!view) return false;
          if (view.state.doc.length === 0) {
            open.value = false;
            onDeleteThisNode?.();
            return true;
          }
          return false;
        },
      },
    ]),
  ];
};

watch(showPos, async () => {
  await nextTick();

  if (!showPos.value) {
    // 延迟 1s 移除样式，因为有淡出动画
    setTimeout(() => {
      document.body.style.removeProperty("--popover-x");
      document.body.style.removeProperty("--popover-y");
    }, 1000);
    return;
  }

  const el = document.querySelector("[data-radix-popper-content-wrapper]");
  if (!(el instanceof HTMLElement)) return;
  const { x, y } = showPos.value!;
  const elRect = el.getBoundingClientRect();
  const mathElRect = mathEl?.getBoundingClientRect() ?? { height: 0 }; // XXX
  const popoverPos = calcPopoverPos(elRect.width, elRect.height, x, y, {
    // showPos 是行内元素下边缘中心的位置
    // 为了防止遮挡当前行，如果是向上方弹出，应该向上偏移 mathEl 的高度，再加 10px 的余量
    // 向下弹出时，向下偏移 10px
    offset: (pos) => {
      pos.leftUp.y -= (mathElRect.height + 10);
      pos.rightUp.y -= (mathElRect.height + 10);
      pos.leftDown.y += 10;
      pos.rightDown.y += 10;
      return pos;
    },
    avoidColideWith: mathEl!,
    minCollisionDist: 10,
  });

  // 聚焦到编辑器，并选中所有
  const view = codeMirror.value?.getEditorView();
  if (!view) return;
  view.focus();
  view.dispatch({
    selection: {
      anchor: 0,
      head: view.state.doc.length,
    },
  });

  // 默认向右下弹出
  // 这里把弹出位置作为 CSS 变量绑定到 body 上
  // 因为 shadcn / radix 把 popover 的样式写死了
  // 只能这样去覆盖
  document.body.style.setProperty("--popover-x", `${popoverPos.rightDown.x}px`);
  document.body.style.setProperty("--popover-y", `${popoverPos.rightDown.y}px`);
})

onMounted(() => {
  registerFloatingMathInput(
    (
      _mathEl,
      _initValue,
      _onChange,
      _onSkipLeft,
      _onSkipRight,
      _onDirectClose,
      _onDeleteThisNode,
    ) => {
      mathEl = _mathEl;
      src.value = _initValue;
      onChange = _onChange;
      onSkipLeft = _onSkipLeft;
      onSkipRight = _onSkipRight;
      onDirectClose = _onDirectClose;
      onDeleteThisNode = _onDeleteThisNode;
      const mathElRect = mathEl.getBoundingClientRect();
      showPos.value = {
        x: mathElRect.left + mathElRect.width / 2,
        y: mathElRect.bottom,
      };
    },
  );
});
</script>

<style lang="scss">
// 覆盖 radix-vue 的样式，这允许我们自己指定 popover 的位置
// 这里使用了 :has 选择器，保证不干扰其他 popover 的样式
[data-radix-popper-content-wrapper]:has(> .ref-suggestions-content) {
  transform: translate(var(--popover-x), var(--popover-y)) !important;
}
</style>
