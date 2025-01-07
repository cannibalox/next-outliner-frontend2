import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { DI_FILTERS } from "@/context/blockTree";
import { useTaskQueue } from "@/plugins/taskQueue";
import { InputRule } from "prosemirror-inputrules";
import type { PmPluginCtx } from "../plugins/pluginContext";

export const turnToCodeBlock = (ctx: PmPluginCtx) => {
  return new InputRule(/^```([a-z]+) $/, (state, match) => {
    const emptyTr = state.tr.setMeta("", "");

    const itemId = ctx.getItemId();
    const tree = ctx.getBlockTree();
    if (!itemId || !tree) return emptyTr;

    const di = tree.getDi(itemId);
    if (!di || !DI_FILTERS.isBlockDi(di)) return emptyTr;

    const { blockEditor } = ctx.blocksContext ?? {};
    if (!blockEditor) return emptyTr;

    const taskQueue = useTaskQueue();

    setTimeout(() => {
      taskQueue.addTask(async () => {
        blockEditor.changeBlockContent({
          blockId: di.block.id,
          content: [BLOCK_CONTENT_TYPES.CODE, "", match[1]],
        });
        await tree.nextUpdate();
        tree.focusDi(itemId);
      });
    });
    return emptyTr;
  });
};
