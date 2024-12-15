import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockContent, BlockId, TextContent } from "@/common/types";
import { pmSchema } from "@/components/prosemirror/pmSchema";

export const textContentFromString = (str: string) =>
  [
    BLOCK_CONTENT_TYPES.TEXT,
    {
      type: "doc",
      content: str.length == 0 ? [] : [pmSchema.text(str).toJSON()],
    },
  ] as TextContent;

export const textContentFromBlockRef = (blockRef: BlockId) =>
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

export const textContentFromNodes = (nodes: Node[]): TextContent => [
  BLOCK_CONTENT_TYPES.TEXT,
  {
    type: "doc",
    content: nodes.map((n) => {
      if ("toJSON" in n && typeof n.toJSON === "function") {
        return n.toJSON();
      }
      throw new Error("Node does not have a toJSON method");
    }),
  },
];

export const isEmptyBlockContent = (content: BlockContent) => {
  if (content[0] === BLOCK_CONTENT_TYPES.TEXT) {
    return content;
  }
};
