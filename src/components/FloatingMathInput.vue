<template>
  <Teleport to="body">
    <Transition name="floating-math-input">
      <div
        class="fixed z-50 left-0 top-0 w-[300px] h-[120px] transition-all ease-in duration-100"
        v-if="show"
        ref="$inputEl"
        :style="inputElInlineStyle"
      >
        <div class="fixed size-full top-0 left-0" @click="(show = false), onDirectClose?.()"></div>
        <div class="relative h-full flex flex-col bg-popover border rounded-lg shadow p-2">
          <CodeMirror
            v-model:src="src"
            class="flex-grow"
            ref="codeMirror"
            :theme="theme"
            lang="latex"
            :extensions-generator="extensionsGenerator"
            :on-src-changed="onChange ?? undefined"
          ></CodeMirror>
          <Label class="text-muted-foreground text-sm font-normal text-right mr-2"
            >Press "Esc" to close</Label
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import CodeMirror from "./codemirror/CodeMirror.vue";
import { EditorView, keymap } from "@codemirror/view";
import { globalEnv } from "@/main";
import Label from "./ui/label/Label.vue";

const show = ref(false);
const src = ref("");
const codeMirror = ref<InstanceType<typeof CodeMirror> | null>(null);
const { globalUiVars } = globalEnv;
const { theme } = globalUiVars;
const inputElInlineStyle = ref<string>("");

// context
let mathEl: HTMLElement | null = null; // 公式块
let onChange: ((value: string) => void) | null = null;
let onSkipLeft: (() => void) | null = null;
let onSkipRight: (() => void) | null = null;
let onDirectClose: (() => void) | null = null;
let onDeleteThisNode: (() => void) | null = null;

const fixPos = (offsetInput: number = 6, offsetWindow: number = 6) => {
  if (!mathEl) return;
  const mathRect = mathEl.getBoundingClientRect();
  const inputRect = { width: 300, height: 120 }; // 固定宽度和高度

  inputElInlineStyle.value = ""; // 清空样式

  // 计算往上弹出和往下弹出哪个更好
  const spaceAbove = mathRect.top;
  const spaceBelow = window.innerHeight - mathRect.bottom;

  if (
    spaceBelow > inputRect.height + offsetInput + offsetWindow || // 下方空间足够，向下弹出
    spaceBelow > spaceBelow // 下方空间不够，但比上方空间更多，则也向下弹出
  ) {
    // 向下弹出
    inputElInlineStyle.value += `max-height: ${spaceBelow - offsetInput - offsetWindow}px;`;
    inputElInlineStyle.value += `top: ${mathRect.bottom + offsetInput}px;`;
  } else {
    // 向上弹出
    inputElInlineStyle.value += `max-height: ${spaceAbove - offsetInput - offsetWindow}px;`;
    inputElInlineStyle.value += `bottom: ${window.innerHeight - mathRect.top + offsetInput}px;`;
  }

  // 调整左右宽度
  // 优先往 mathEl 正下方弹出
  const mathElCenterX = (mathRect.left + mathRect.right) / 2;
  if (mathElCenterX > inputRect.width / 2) {
    // 左边宽度足够
    inputElInlineStyle.value += `left: ${mathElCenterX - inputRect.width / 2}px;`;
  } else {
    // 左边宽度不够，靠左
    inputElInlineStyle.value += `left: 0px;`;
  }

  console.log("inputElInlineStyle", inputElInlineStyle.value);
};

const extensionsGenerator = () => {
  return [
    EditorView.lineWrapping,
    keymap.of([
      {
        key: "Escape",
        run: () => {
          show.value = false;
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
            show.value = false;
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
            show.value = false;
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
            show.value = false;
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
            show.value = false;
            onDeleteThisNode?.();
            return true;
          }
          return false;
        },
      },
    ]),
  ];
};

onMounted(() => {
  globalUiVars.registerFloatingMathInput(
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
      fixPos();
      show.value = true;
      nextTick(() => {
        // 聚焦，并选中所有
        const view = codeMirror.value?.getEditorView();
        if (!view) return;
        view.focus();
        view.dispatch({
          selection: {
            anchor: 0,
            head: view.state.doc.length,
          },
        });
      });
    },
  );
});
</script>
