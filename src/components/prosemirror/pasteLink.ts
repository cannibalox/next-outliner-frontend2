import { Plugin } from "prosemirror-state";
import { Fragment, Node, Slice } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { pmSchema } from "./pmSchema";
import { fetchWebpageTitle } from "@/common/api-call/misc";

export const hrefToTitle = (editorView: EditorView) => {
  // 提取出 editorView 中的所有链接
  const links: string[] = [];
  editorView.state.doc.descendants((node, pos) => {
    const linkMark = pmSchema.marks.link.isInSet(node.marks);
    if (linkMark) {
      links.push(linkMark.attrs.href);
    }
  });
  console.log("links", links);

  // 获取每个链接的标题
  for (const link of links) {
    fetchWebpageTitle({ webpageUrl: link }).then((resp) => {
      if (!resp.success) return;
      const title = resp.data.title;
      if (!title) return;
      if (editorView.isDestroyed) return;
      // 定位这个 link
      // 注意我们必须重新定位，因为这期间 editorView 可能已经改动了
      let nodeInfo: any = null;
      editorView.state.doc.descendants((node, pos) => {
        if (nodeInfo) return false;
        const linkMark = pmSchema.marks.link.isInSet(node.marks);
        if (linkMark && linkMark.attrs.href === link) {
          nodeInfo = { node, pos };
          return false;
        }
      });
      if (!nodeInfo) return;
      const mark = pmSchema.marks.link.create({ href: link });
      const newNode = pmSchema.text(title, [mark]);
      const tr = editorView.state.tr.replaceWith(
        nodeInfo.pos,
        nodeInfo.pos + nodeInfo.node.nodeSize,
        newNode,
      );
      editorView.dispatch(tr);
    });
  }
};
