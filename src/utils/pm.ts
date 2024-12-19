import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockContent, BlockId, TextContent } from "@/common/types";
import { linkify } from "@/components/prosemirror/plugins/pasteLink";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { Fragment } from "prosemirror-model";

export const plainTextToPmNode = (str: string) => {
  let content;
  if (str.length === 0) {
    content = Fragment.empty;
  } else {
    const textNode = pmSchema.text(str);
    content = linkify(Fragment.from(textNode), []);
  }
  return pmSchema.nodes.doc.create({}, content);
};

export const plainTextToTextContent = (str: string) => {
  let content;
  if (str.length === 0) {
    content = Fragment.empty;
  } else {
    const textNode = pmSchema.text(str);
    content = linkify(Fragment.from(textNode), []);
  }
  const docNode = pmSchema.nodes.doc.create({}, content);
  return [BLOCK_CONTENT_TYPES.TEXT, docNode.toJSON()] as TextContent;
};

export const blockRefToTextContent = (blockRef: BlockId) =>
  [
    BLOCK_CONTENT_TYPES.TEXT,
    {
      type: "doc",
      content: [
        {
          type: "blockRef_v2",
          attrs: {
            toBlockId: blockRef,
            tag: false,
          },
        },
      ],
    },
  ] as TextContent;
