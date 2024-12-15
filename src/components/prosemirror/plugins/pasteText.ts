import { useTaskQueue } from "@/plugins/taskQueue";
import { textContentFromString } from "@/utils/pm";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import parseHtml from "../domParser";

export const mkPasteTextPlugin = () => {
  const { lastFocusedBlockId } = globalThis.getLastFocusContext()!;
  const { showPasteDialog } = globalThis.getPasteDialogContext()!;
  const { blockEditor } = globalThis.getBlocksContext()!;
  const { blocksManager } = globalThis.getBlocksContext()!;

  return new Plugin({
    props: {
      handlePaste(view: EditorView, event: ClipboardEvent) {
        const blockId = lastFocusedBlockId.value;
        if (blockId == null) return false;

        const html = event.clipboardData?.getData("text/html");
        if (html) {
          console.log(html);
          const [blocks, blocksMap] = parseHtml(html);
          console.log(blocks, blocksMap);
          return true;
        }

        // 获取粘贴的纯文本内容
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;

        // 按行分割文本,过滤掉空行
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length === 0) return false;

        // 如果内容较多,显示确认对话框
        if (lines.length > 10) {
          showPasteDialog(text);
        } else {
          // 少量内容直接粘贴
          const taskQueue = useTaskQueue();
          taskQueue.addTask(() => {
            const tr = blocksManager.createBlockTransaction({ type: "ui" });

            // 如果当前块为空,使用第一行替换当前块内容
            const currentBlock = view.state.doc.textContent.trim() === "";
            if (currentBlock) {
              blockEditor.changeBlockContent({
                blockId,
                content: textContentFromString(lines[0]),
                tr,
                commit: false,
              });
              lines.shift();
            }

            // 剩余的行创建为新块
            if (lines.length > 0) {
              blockEditor.insertNormalBlocks({
                pos: {
                  baseBlockId: blockId,
                  offset: 1,
                },
                blocks: lines.map((line) => ({
                  content: textContentFromString(line),
                })),
                tr,
                commit: false,
              });
            }

            tr.commit();
          });
        }

        return true;
      },
    },
  });
};
