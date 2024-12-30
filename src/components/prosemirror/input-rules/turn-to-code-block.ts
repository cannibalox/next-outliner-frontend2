import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { BlockTree } from "@/context/blockTree";
import { useTaskQueue } from "@/plugins/taskQueue";
import { InputRule } from "prosemirror-inputrules";

export const turnToCodeBlock = (
  getBlockId: () => BlockId,
  getBlockTree: () => BlockTree | null,
) => {
  return new InputRule(/^```([a-z]+) $/, (state, match) => {
    const blockId = getBlockId();
    const blockTree = getBlockTree();
    const taskQueue = useTaskQueue();
    const { blockEditor } = getBlocksContext() ?? {};
    if (!blockEditor) return state.tr.setMeta("", "");
    setTimeout(() => {
      taskQueue.addTask(async () => {
        console.log("turn to code block", blockId);
        blockEditor.changeBlockContent({
          blockId,
          content: [BLOCK_CONTENT_TYPES.CODE, "", match[1]],
        });
        if (blockTree) {
          await blockTree.nextUpdate();
          blockTree.focusBlock(blockId);
        }
      });
    });
    return state.tr.setMeta("", ""); // empty transaction
  });
};
