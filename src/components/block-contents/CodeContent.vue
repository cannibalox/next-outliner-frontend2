<template>
  <CodeMirror
    class="code-content block-content"
    ref="cmWrapper"
    v-model:src="src!"
    :readonly="readonly"
    :lang="block.content[2]!"
    :extensions-generator="extensionsGenerator"
    :on-src-changed="handleSrcChange"
    :keymap="codemirrorKeymap"
  >
  </CodeMirror>
</template>

<script setup lang="ts">
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { CodeContent } from "@/common/types";
import BlocksContext from "@/context/blocks-provider/blocks";
import type { BlockTree } from "@/context/blockTree";
import KeymapContext from "@/context/keymap";
import { useTaskQueue } from "@/plugins/taskQueue";
import { closeBrackets } from "@codemirror/autocomplete";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from "vue";
import CodeMirror from "../codemirror/CodeMirror.vue";
import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";

const props = defineProps<{
  blockTree?: BlockTree;
  block: Block;
  readonly?: boolean;
}>();

const { blockEditor } = BlocksContext.useContext();
const taskQueue = useTaskQueue();
const src = ref<string | null>(null);
const cmWrapper = ref<InstanceType<typeof CodeMirror> | null>(null);
const { codemirrorKeymap } = KeymapContext.useContext();
const extensionsGenerator = () => {
  const ret: Extension[] = props.readonly
    ? []
    : [indentOnInput(), bracketMatching(), closeBrackets()];
  return ret;
};

const handleSrcChange = (newSrc: string) => {
  const blockId = props.block.id;
  const newBlockContent: CodeContent = [
    BLOCK_CONTENT_TYPES.CODE,
    newSrc,
    props.block.content[2]!,
  ] as const;
  taskQueue.addTask(
    () => {
      blockEditor.changeBlockContent({
        blockId,
        content: newBlockContent,
      });
    },
    {
      type: "updateBlockContent" + blockId,
      delay: 500,
      debounce: true,
    },
  );
};

watch(
  () => props.block.content,
  (newContent) => {
    if (newContent[0] !== BLOCK_CONTENT_TYPES.CODE) return; // IMPOSSIBLE
    src.value = newContent[1];
  },
  { immediate: true },
);

onMounted(() => {
  // 加载时，向 blockTree 注册 editorView
  const blockId = props.block.id;
  const editorView = cmWrapper.value?.getEditorView();
  if (editorView) {
    props.blockTree?.registerEditorView(blockId, editorView);
  }
});

onUnmounted(() => {
  // 卸载时，从 blockTree 注销 editorView
  const blockId = props.block.id;
  const editorView = cmWrapper.value?.getEditorView();
  if (editorView) {
    props.blockTree?.unregisterEditorView(blockId, editorView);
    editorView.destroy();
  }
});
</script>
