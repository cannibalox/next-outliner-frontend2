<template>
  <ProseMirror
    class="text-content block-content"
    ref="pmWrapper"
    v-model:doc="docJson"
    :readonly="readonly"
    :plugins-generator="customPluginsGenerator"
    :disable-spellcheck-when-blur="true"
    :on-doc-changed="onDocChanged"
  ></ProseMirror>
</template>

<script setup lang="ts">
import type { LoadedBlockWithLevel, TextContent } from "@/common/types";
import type { EditorProps, EditorView } from "prosemirror-view";
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import ProseMirror from "@/components/prosemirror/ProseMirror.vue";
import { globalEnv } from "@/main";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { inputRules } from "prosemirror-inputrules";
import { mkPasteLinkPlugin } from "../prosemirror/plugins/pasteLink";
import type { BlockTree } from "@/modules/blockTreeRegistry";
import { mkKeymapPlugin } from "../prosemirror/plugins/keymap";

const props = defineProps<{
  blockTree?: BlockTree;
  block: LoadedBlockWithLevel;
  readonly?: boolean;
}>();

const { taskQueue, blockEditor } = globalEnv;
const docJson = shallowRef<any | null>(null);
const pmWrapper = ref<InstanceType<typeof ProseMirror> | null>(null);
const onDocChanged = ({ newDoc }: { newDoc: any }) => {
  const blockId = props.block.id;
  const newBlockContent: TextContent = [BLOCK_CONTENT_TYPES.TEXT, newDoc];
  taskQueue.addTask(
    () => {
      blockEditor.changeBlockContent(blockId, newBlockContent);
    },
    "updateBlockContent" + blockId,
    500,
    true,
  );
};

const customPluginsGenerator = (getEditorView: () => EditorView | null, readonly: boolean) => {
  const getBlockId = () => props.block.id;
  const getBlockTree = () => props.blockTree ?? null;

  if (props.readonly) {
    return [];
  } else {
    return [
      inputRules({
        rules: [
        ],
      }),
      mkKeymapPlugin(),
      mkPasteLinkPlugin(),
    ];
  }
};

watch(
  () => props.block.content,
  (content) => {
    if (content[0] != BLOCK_CONTENT_TYPES.TEXT) return;
    docJson.value = content[1];
  },
  { immediate: true },
);

onMounted(() => {
  // 将 editorView 附到 wrapperDom 上
  const editorView = pmWrapper.value?.getEditorView();
  const wrapperDom = pmWrapper.value?.getWrapperDom();
  if (editorView && wrapperDom) Object.assign(wrapperDom, { pmView: editorView });
});

onBeforeUnmount(() => {
  const wrapperDom = pmWrapper.value?.getWrapperDom();
  if (wrapperDom && "pmView" in wrapperDom) delete wrapperDom["pmView"];
});
</script>

<style lang="scss">
.text-content {
  cursor: text;
  max-width: calc(100% - 48px);
  padding: var(--content-padding) 0;
  font-family: var(--text-font);
  font-size: var(--text-font-size);
  line-height: var(--line-height-normal);
}

// 拖拽时光标样式
.block-tree.dragging .ProseMirror {
  cursor: grabbing;
}

// 高亮样式
span[bg="bg1"] {
  background-color: var(--highlight-1);
}

span[bg="bg2"] {
  background-color: var(--highlight-2);
}

span[bg="bg3"] {
  background-color: var(--highlight-3);
}

span[bg="bg4"] {
  background-color: var(--highlight-4);
}

span[bg="bg5"] {
  background-color: var(--highlight-5);
}

span[bg="bg6"] {
  background-color: var(--highlight-6);
}

span[bg="bg7"] {
  background-color: var(--highlight-7);
}

// 行内代码块样式
code {
  font-family: var(--code-font);
  font-size: var(--code-font-size);
  color: var(--code-color);
  line-height: 1em;
  background-color: var(--code-background);
  padding: 0 3px;
  border-radius: 3px;
  word-break: break-all;
}

// 链接与本地路径引用
a,
span.local-path {
  color: var(--link-color);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

// 块引用
span.block-ref,
span.block-ref-v2 {
  color: var(--link-color);
  cursor: pointer;

  &.invalid {
    color: var(--errmsg-color);
  }
}

span.cloze {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1.5px;
  text-decoration-color: var(--cloze-underline-color);
  background-color: var(--cloze-bg-color);
}

// 标签
span.block-ref-v2.tag {
  cursor: pointer;
  color: var(--tag-color);
  opacity: 0.5;
  font-size: 0.9em;
  line-height: 1em;
  text-decoration: unset;

  &:hover {
    opacity: 1;
  }
}

span.block-ref-v2.tag::before {
  content: "#";
}

// 自动识别的日期时间 & 虚拟引用
span.date-time,
span.virtual-ref {
  color: var(--link-color);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-style: dashed;
  text-decoration-thickness: 1px;
}

span.local-path:before {
  display: inline-block;
  margin-bottom: -3px;
  margin-right: 2px;
  content: "";
  height: 15px;
  width: 15px;
  background-color: var(--text-secondary-color);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-file'%3E%3Cpath d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/%3E%3Cpath d='M14 2v4a2 2 0 0 0 2 2h4'/%3E%3C/svg%3E");
}

a:before {
  display: inline-block;
  margin-bottom: -3px;
  margin-right: 2px;
  content: "";
  height: 15px;
  width: 15px;
  background-color: var(--link-color);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-link'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E");
}

.trailing-hint {
  font-style: italic;
  padding-left: 10px;
  opacity: 0.37;
  cursor: pointer;

  &:hover {
    opacity: 0.5;
  }
}
</style>