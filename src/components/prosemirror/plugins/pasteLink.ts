import { Plugin } from "prosemirror-state";
import { Fragment, Node, Slice } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { pmSchema } from "../pmSchema";
import { fetchWebpageTitle } from "@/common/api/misc";

export const mkPasteLinkPlugin = () => {
  let editorView: EditorView | null = null;

  return new Plugin({
    view: (_editorView) => {
      // get associated editorView
      editorView = _editorView;
      return {};
    },
    props: {
      transformPasted(slice) {
        const links: string[] = [];
        const linkified = linkify(slice.content, links);

        // replace links' display text with their titles
        if (links.length > 0) {
          setTimeout(async () => {
            if (!(editorView instanceof EditorView)) return;
            for (const link of links) {
              const resp = await fetchWebpageTitle({ webpageUrl: link });
              if (!resp.success) return;
              const title = resp.data.title;
              if (!title) return;
              const mark = pmSchema.marks.link.create({ href: link });
              const newNode = pmSchema.text(title, [mark]);

              let linkNodeInfo: any = null;
              editorView.state.doc.descendants((node, pos) => {
                if (linkNodeInfo) return false;
                const linkMark = pmSchema.marks.link.isInSet(node.marks);
                if (linkMark && linkMark.attrs.href === link) {
                  linkNodeInfo = { node, pos };
                  return false;
                }
              });

              if (linkNodeInfo) {
                const tr = editorView.state.tr.replaceWith(
                  linkNodeInfo.pos,
                  linkNodeInfo.pos + linkNodeInfo.node.nodeSize,
                  newNode,
                );
                editorView.dispatch(tr);
              }
            }
          });
        }

        return new Slice(linkified, slice.openStart, slice.openEnd);
      },
    },
  });
};

const HTTP_LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
const linkify = function (fragment: Fragment, links: string[]): Fragment {
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
        linkified.push(
          child.cut(start, end).mark(linkMark.addToSet(child.marks)),
        );
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