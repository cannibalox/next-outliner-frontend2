import { createContext } from "@/utils/createContext";
import type { BlockId } from "@/common/types";
import type { DisplayItem, DisplayItemGenerator } from "@/utils/display-item";
import type mitt from "@/utils/mitt";
import type { EditorView as PmEditorView } from "prosemirror-view";
import type { EditorView as CmEditorView } from "@codemirror/view";
import type { Block } from "./blocks-provider/app-state-layer/blocksManager";
import { ref } from "vue";

export type BlockTreeId = string;

export type BlockTreeEventMap = {
  displayItemsUpdated: [DisplayItem[]];
};

export type BlockTreeProps = {
  id: string;
  virtual?: boolean;
  rootBlockIds: BlockId[];
  rootBlockLevel: number;
  forceFold?: boolean;
  diGenerator?: DisplayItemGenerator;
  paddingBottom?: number;
  paddingTop?: number;
};

export type BlockTree = {
  getEditorViews: () => Map<BlockId, CmEditorView | PmEditorView>;
  getProps: () => BlockTreeProps;
  getId: () => string;
  getDom: () => HTMLElement;
  getRootBlockIds: () => BlockId[];
  getDisplayItems: () => DisplayItem[];
  localEventBus: ReturnType<typeof mitt<BlockTreeEventMap>>;
  nextUpdate: (cb?: () => void | Promise<void>) => Promise<void>;
  getEditorView: (blockId: BlockId) => CmEditorView | PmEditorView | null;
  registerEditorView: (blockId: BlockId, editorView: PmEditorView | CmEditorView) => void;
  unregisterEditorView: (blockId: BlockId, editorView: PmEditorView | CmEditorView) => void;
  getSuccessorBlock: (blockId: BlockId) => Block | null;
  getPredecessorBlock: (blockId: BlockId) => Block | null;
  getBlockAbove: (blockId: BlockId) => Block | null;
  getBlockBelow: (blockId: BlockId) => Block | null;
  focusBlock: (
    blockId: BlockId,
    options?: {
      scrollIntoView?: boolean;
      highlight?: boolean;
      expandIfFold?: boolean;
    },
  ) => void;
  getDomOfDi: (itemId: string) => HTMLElement | null;
  moveCursorToTheEnd: (blockId: BlockId) => void;
  moveCursorToBegin: (blockId: BlockId) => void;
};

export const BlockTreeContext = createContext(() => {
  const blockTrees = new Map<BlockTreeId, BlockTree>();

  const registerBlockTree = (blockTree: BlockTree) => {
    blockTrees.set(blockTree.getId(), blockTree);
  };

  const getBlockTree = (id: BlockTreeId) => {
    return blockTrees.get(id);
  };

  const unregisterBlockTree = (id: BlockTreeId) => {
    blockTrees.delete(id);
  };

  const ctx = {
    registerBlockTree,
    getBlockTree,
    unregisterBlockTree,
  };
  // 通过 globalThis 暴露给组件外使用
  globalThis.getBlockTreeContext = () => ctx;
  return ctx;
});

export default BlockTreeContext;
