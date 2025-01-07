import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { TextContent } from "@/common/type-and-schemas/block/block-content";
import { getPmSchema } from "@/components/prosemirror/pmSchema";
import { Fragment, Node, Schema } from "prosemirror-model";

const HTTP_LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;

export const linkify = function (fragment: Fragment, links: string[]): Fragment {
  const linkified: Node[] = [];

  fragment.forEach((child: Node) => {
    if (child.isText) {
      const text = child.text as string;
      let pos = 0,
        match;

      // eslint-disable-next-line no-cond-assign
      while ((match = HTTP_LINK_REGEX.exec(text))) {
        const start = match.index;
        const end = start + match[0].length;
        const linkMarkType = child.type.schema.marks["link"];

        // simply copy across the text from before the match
        if (start > 0) {
          linkified.push(child.cut(pos, start));
        }

        const urlText = text.slice(start, end);
        const linkMark = linkMarkType.create({ href: urlText });
        linkified.push(child.cut(start, end).mark(linkMark.addToSet(child.marks)));
        links.push(urlText);
        pos = end;
      }

      // copy over whatever is left
      if (pos < text.length) {
        linkified.push(child.cut(pos));
      }
    } else {
      linkified.push(child.copy(linkify(child.content, links)));
    }
  });

  return Fragment.fromArray(linkified);
};

export const contentNodesToPmNode = (nodes: Node[]) =>
  [
    BLOCK_CONTENT_TYPES.TEXT,
    {
      type: "doc",
      content: nodes.map((n) => n.toJSON()),
    },
  ] as TextContent;

export const plainTextToPmNode = (str: string, schema: Schema) => {
  let content;
  if (str.length === 0) {
    content = Fragment.empty;
  } else {
    const textNode = schema.text(str);
    content = linkify(Fragment.from(textNode), []);
  }
  return schema.nodes.doc.create({}, content);
};

export const plainTextToTextContent = (str: string, schema: Schema) => {
  let content;
  if (str.length === 0) {
    content = Fragment.empty;
  } else {
    const textNode = schema.text(str);
    content = linkify(Fragment.from(textNode), []);
  }
  const docNode = schema.nodes.doc.create({}, content);
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
