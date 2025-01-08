import { InputRule } from "prosemirror-inputrules";
import type { PmPluginCtx } from "../plugins/pluginContext";

export const turnToInlineCode = (ctx: PmPluginCtx) =>
  new InputRule(/`([^`]+)`$/, (state, match) => {
    const cursorPos = state.selection.anchor;
    const schema = ctx.getSchema();
    const mark = schema.marks.code.create({});
    const node = schema.text(match[1], [mark]);
    const tr = state.tr.replaceRangeWith(cursorPos - match[0].length + 1, cursorPos, node);
    tr.removeStoredMark(mark);
    return tr;
  });
