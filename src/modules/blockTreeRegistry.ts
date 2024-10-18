import { defineModule } from "@/common/module";
import type { BlockId } from "@/common/types";
import type { DisplayItem, DisplayItemGenerator } from "@/utils/display-item";
import type mitt from "@/utils/mitt";
import type { EditorView as PmEditorView } from "prosemirror-view";
import type { EditorView as CmEditorView } from "@codemirror/view";

export type BlockTreeId = string;

export type BlockTreeEventMap = {
  displayItemsUpdated: [DisplayItem[]];
};

export type BlockTree = {
  getProps: () => BlockTreeProps;
  getId: () => string;
  getDom: () => HTMLElement;
  getRootBlockIds: () => BlockId[];
  getDisplayItems: () => DisplayItem[];
  localEventBus: ReturnType<typeof mitt<BlockTreeEventMap>>;
  nextUpdate: (cb?: () => void | Promise<void>) => Promise<void>;
  getEditorView: (blockId: BlockId) => CmEditorView | PmEditorView | null;
}

export type BlockTreeProps = {
  id: string;
  // 是否使用虚拟滚动
  virtual?: boolean;
  // 根块 id 列表
  rootBlockIds: BlockId[];
  // 根块的层级
  rootBlockLevel: number;
  // 是否强制折叠
  forceFold?: boolean;
  // 自定义生成 displayItems 的方法
  diGenerator?: DisplayItemGenerator;
  // 底部 padding
  paddingBottom?: number;
}

export const blockTreeRegistry = defineModule("blockTreeRegistry", {}, () => {
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

  return {
    registerBlockTree,
    getBlockTree,
    unregisterBlockTree,
  };
});
