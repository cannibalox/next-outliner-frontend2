<template>
  <CodeMirror
    class="code-content block-content"
    ref="cmWrapper"
    v-model:src="src!"
    :theme="theme"
    :readonly="readonly"
    :lang="block.content[2]!"
    :extensions-generator="extensionsGenerator"
    :on-src-changed="handleSrcChange"
  >
  </CodeMirror>
</template>

<script setup lang="ts">
import type { BlockTree } from "@/context/blockTree";
import CodeMirror from "../codemirror/CodeMirror.vue";
import type { BlockWithLevel } from "@/context/blocks-provider/blocksManager";
import BlocksContext from "@/context/blocks-provider/blocks";
import { useTaskQueue } from "@/plugins/taskQueue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import ThemeContext from "@/context/theme";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { CodeContent } from "@/common/types";
import { watch } from "vue";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { keymap } from "@codemirror/view";
import KeymapContext from "@/context/keymap";
import type { Extension } from "@codemirror/state";
import { closeBrackets } from "@codemirror/autocomplete";

const props = defineProps<{
  blockTree?: BlockTree;
  block: BlockWithLevel;
  readonly?: boolean;
}>();

const { blockEditor } = BlocksContext.useContext();
const taskQueue = useTaskQueue();
const { theme } = ThemeContext.useContext();
const src = ref<string | null>(null);
const cmWrapper = ref<InstanceType<typeof CodeMirror> | null>(null);
const { codemirrorKeymap } = KeymapContext.useContext();
const extensionsGenerator = () => {
  const ret: Extension[] = props.readonly
    ? []
    : [indentOnInput(), bracketMatching(), closeBrackets(), keymap.of(codemirrorKeymap)];
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
      blockEditor.changeBlockContent(blockId, newBlockContent);
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

onBeforeUnmount(() => {
  // 卸载时，从 blockTree 注销 editorView
  const blockId = props.block.id;
  const editorView = cmWrapper.value?.getEditorView();
  if (editorView) {
    props.blockTree?.unregisterEditorView(blockId, editorView);
  }
});
</script>
