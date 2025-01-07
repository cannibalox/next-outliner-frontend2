import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { PmPluginCtx } from "./pluginContext";

export const mkHighlightRefsPlugin = (ctx: PmPluginCtx) =>
  new Plugin({
    props: {
      decorations: (state) => {
        const blockIds = ctx.getHighlightRefs();
        if (!blockIds || blockIds.length == 0) return null;
        const decorations: Decoration[] = [];
        state.doc.content.descendants((node, pos) => {
          if (node.type.name == "blockRef_v2" && blockIds.includes(node.attrs.toBlockId)) {
            const d = Decoration.inline(pos, pos + 1, { class: "highlight-keep" });
            decorations.push(d);
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
