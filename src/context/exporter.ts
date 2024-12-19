import { createContext } from "@/utils/createContext";
import BlocksContext from "./blocks-provider/blocks";
import { DOMSerializer, Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { Block } from "./blocks-provider/app-state-layer/blocksManager";
import { ref, toRaw } from "vue";
import type { BlockId } from "@/common/types";
import prettify from "html-prettify";

const ExporterContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext();

  const open = ref(false);
  const blockId = ref<BlockId | undefined>(undefined);

  const exportSubtreeToPlainText = (
    rootBlockId: string,
    options: {
      nonFoldOnly?: boolean;
    } = {},
  ) => {
    options.nonFoldOnly ??= false;

    let result = "";
    blocksManager.forDescendants({
      onEachBlock: (b, level) => {
        result += "  ".repeat(level) + "- " + b.ctext + "\n";
      },
      rootBlockId,
      rootBlockLevel: 0,
      nonFoldOnly: options.nonFoldOnly,
      includeSelf: true,
    });
    return result;
  };

  const exportSubtreeToHtml = (
    rootBlockId: string,
    options: {
      nonFoldOnly?: boolean;
    } = {},
  ) => {
    options.nonFoldOnly ??= false;

    const rootEl = document.createElement("ul");
    const pmSerializer = DOMSerializer.fromSchema(pmSchema);

    const dfs = (block: Block, containerEl: HTMLElement) => {
      if (block.fold && options.nonFoldOnly) return;

      const li = document.createElement("li");
      const content = block.content;
      if (content[0] === BLOCK_CONTENT_TYPES.TEXT) {
        const docNode = Node.fromJSON(pmSchema, block.content[1]);
        const frag = pmSerializer.serializeFragment(docNode.content);
        li.appendChild(frag);
      }

      if (block.childrenRefs.length > 0) {
        const ul = document.createElement("ul");
        for (const childRef of block.childrenRefs) {
          if (childRef.value && !childRef.value.deleted) {
            const rawBlock = toRaw(childRef.value);
            dfs(rawBlock, ul);
          }
        }
        li.appendChild(ul);
      }

      containerEl.appendChild(li);
    };

    const rootBlock = blocksManager.getBlock(rootBlockId);
    if (!rootBlock) {
      console.error("Cannot find root block", rootBlockId);
      return "";
    }
    dfs(rootBlock, rootEl);
    return prettify(rootEl.outerHTML);
  };

  const exportSubtreeToMarkdown = (rootBlockId: string) => {
    return "";
  };

  const exportSubtreeToPdf = (rootBlockId: string) => {
    return "";
  };

  const openExporter = (blockId_: BlockId) => {
    open.value = true;
    blockId.value = blockId_;
  };

  const closeExporter = () => {
    open.value = false;
    blockId.value = undefined;
  };

  const ctx = {
    open,
    blockId,
    openExporter,
    closeExporter,
    exportSubtreeToPlainText,
    exportSubtreeToHtml,
    exportSubtreeToMarkdown,
    exportSubtreeToPdf,
  };
  globalThis.getExporterContext = () => ctx;
  return ctx;
});

export default ExporterContext;
