import type { BlockContent } from "@/common/type-and-schemas/block/block-content";
import { pmSchema } from "./pmSchema";
import { DOMParser as ProsemirrorDOMParser, Slice } from "prosemirror-model";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { nanoid } from "nanoid";
import { linkify } from "./plugins/pasteLink";

type Block = {
  id: string;
  content: BlockContent;
  children: Block[];
  parentId?: string;
};

const blockTags: { [tagName: string]: boolean } = {
  ADDRESS: true,
  ARTICLE: true,
  ASIDE: true,
  BLOCKQUOTE: true,
  BODY: true,
  CANVAS: true,
  DD: true,
  DIV: true,
  DL: true,
  FIELDSET: true,
  FIGCAPTION: true,
  FIGURE: true,
  FOOTER: true,
  FORM: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  HEADER: true,
  HGROUP: true,
  HR: true,
  LI: true,
  NOSCRIPT: true,
  OL: true,
  OUTPUT: true,
  P: true,
  PRE: true,
  SECTION: true,
  TABLE: true,
  TFOOT: true,
  UL: true,
};

const ignoreTags: { [tagName: string]: boolean } = {
  HEAD: true,
  NOSCRIPT: true,
  OBJECT: true,
  SCRIPT: true,
  STYLE: true,
  TITLE: true,
};

function parseHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const ctx: Block[] = [];
  const blocks: Record<string, Block> = {};
  const domParser = ProsemirrorDOMParser.fromSchema(pmSchema);

  function addBlock(dom: Node, ctx: Block[], parentId?: string) {
    let docNode = domParser.parse(dom);
    if (docNode.content.size === 0) return;

    // 解析链接
    const links: string[] = [];
    const linkified = linkify(docNode.content, links);
    const slice = Slice.maxOpen(linkified);
    docNode = docNode.replace(0, docNode.content.size, slice);

    const id = nanoid();
    blocks[id] = {
      id,
      content: [BLOCK_CONTENT_TYPES.TEXT, docNode.toJSON()],
      children: [],
      parentId,
    };
    ctx.push(blocks[id]);
  }

  function traverse(node: Node, ctx: Block[], parentId?: string) {
    if (node instanceof HTMLOListElement || node instanceof HTMLUListElement) {
      const newCtx = ctx.length === 0 ? ctx : ctx[ctx.length - 1].children;
      const newParentId = ctx.length === 0 ? parentId : ctx[ctx.length - 1].id;
      for (const child of (node as HTMLElement).childNodes) {
        traverse(child, newCtx, newParentId); // 对每个子元素递归
      }
    } else if (node instanceof HTMLElement && blockTags[node.tagName]) {
      const childNodes = [...node.childNodes.values()];
      for (let i = 0; i < childNodes.length; i++) {
        let j = i;
        for (; j < childNodes.length; j++) {
          const jthChild = childNodes[j];
          if (jthChild instanceof HTMLElement && blockTags[jthChild.tagName]) break;
        }
        if (j > i) {
          const el = document.createElement("div");
          el.append(...childNodes.slice(i, j));
          addBlock(el, ctx, parentId);
          el.remove();
        }
        if (j < childNodes.length) {
          traverse(childNodes[j], ctx, parentId);
        }
        i = j;
      }
    } else if (node instanceof HTMLElement && ignoreTags[node.tagName]) {
      return;
    } else {
      addBlock(node, ctx, parentId);
    }
  }

  traverse(doc.body, ctx, undefined); // 根块没有父块
  return [ctx, blocks] as const;
}

export default parseHtml;
