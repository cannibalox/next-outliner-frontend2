import { useTaskQueue } from "@/plugins/taskQueue";
import { plainTextToPmNode, plainTextToTextContent } from "@/utils/pm";
import { AllSelection, Plugin, TextSelection } from "prosemirror-state";
import { EditorView as PmEditorView } from "prosemirror-view";
import parseHtml from "../domParser";
import { DOMParser, Node } from "prosemirror-model";
import { pmSchema } from "../pmSchema";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { hrefToTitle } from "../pasteLink";

export const mkPasteTextPlugin = () => {
  const { lastFocusedBlockId, lastFocusedBlockTree } = globalThis.getLastFocusContext()!;
  const { showPasteDialog } = globalThis.getPasteDialogContext()!;
  const { blockEditor } = globalThis.getBlocksContext()!;
  const { blocksManager } = globalThis.getBlocksContext()!;

  return new Plugin({
    props: {
      handlePaste(view: PmEditorView, event: ClipboardEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const taskQueue = useTaskQueue();
        const blockId = lastFocusedBlockId.value;
        if (blockId == null) return false;
        const tree = lastFocusedBlockTree.value;
        const currBlockEmpty = view.state.doc.textContent.trim() === "";

        // 检测到 html 内容
        // 则优先粘贴 html，以保持格式
        const html = event.clipboardData?.getData("text/html");
        if (html) {
          const [parsedTree, parsedBlocks] = parseHtml(html);
          if (parsedTree.length === 0) return false;

          // 如果只解析出一个块，并且是文本块，则将该块拼在当前块的光标后面，
          // 并且将光标移动到粘贴内容的末尾，而不是在下方创建新块
          if (Object.keys(parsedBlocks).length === 1) {
            const block = Object.values(parsedBlocks)[0];
            if (block.content[0] === BLOCK_CONTENT_TYPES.TEXT) {
              const insertedDoc = Node.fromJSON(pmSchema, block.content[1]);
              const tr = view.state.tr.replaceSelectionWith(insertedDoc);
              view.dispatch(tr);
              hrefToTitle(view);
              return true;
            }
          }

          // 否则，粘贴所有块到当前块的下方
          taskQueue.addTask(async () => {
            const tr = blocksManager.createBlockTransaction({ type: "ui" });

            // 插入所有非根块
            Object.values(parsedBlocks).forEach((b) => {
              if (b.parentId == null) return;
              tr.addBlock({
                type: "normalBlock",
                id: b.id,
                parentId: b.parentId,
                childrenIds: b.children.map((c) => c.id),
                fold: false,
                content: b.content,
                metadata: {},
              });
            });

            // 将所有根块插入
            blockEditor.insertNormalBlocks({
              pos: {
                baseBlockId: blockId,
                offset: 1,
              },
              blocks: parsedTree.map((block) => {
                return {
                  id: block.id,
                  content: block.content,
                  childrenIds: block.children.map((c) => c.id),
                };
              }),
              tr,
              commit: false,
            });

            // 如果当前块为空，则删除当前块
            if (currBlockEmpty) {
              tr.deleteBlock(blockId);
            }

            tr.commit();

            if (tree) {
              await tree.nextUpdate();
              // 聚焦到插入的最后一个块，并将光标移至末尾
              const lastBlockId = parsedTree[parsedTree.length - 1].id;
              if (lastBlockId) {
                await tree.focusBlock(lastBlockId);
                const view = tree.getEditorView(lastBlockId);
                if (view instanceof PmEditorView) {
                  const sel = AllSelection.atEnd(view.state.doc);
                  const tr = view.state.tr.setSelection(sel);
                  view.dispatch(tr);
                }
              }
            }
          });
          hrefToTitle(view);

          return true;
        } else {
          // 否则，如果有纯文本，则粘贴纯文本
          const text = event.clipboardData?.getData("text/plain");
          if (!text) return false;

          // 按行分割文本,过滤掉空行
          const lines = text.split(/\r?\n/).filter((line) => line.trim());
          if (lines.length === 0) return false;

          // 如果内容较多,显示确认对话框
          if (false) {
            // 不显示对话框
            // showPasteDialog(text);
          } else {
            // 少量内容直接粘贴
            taskQueue.addTask(async () => {
              const tr = blocksManager.createBlockTransaction({ type: "ui" });
              // 如果只有一行，则直接该块拼在当前块的光标后面，
              // 并且将光标移动到粘贴内容的末尾，而不是在下方创建新块
              if (lines.length === 1) {
                const insertedDoc = plainTextToPmNode(lines[0]);
                const tr = view.state.tr.replaceSelectionWith(insertedDoc);
                view.dispatch(tr);
                hrefToTitle(view);
                return;
              }

              // 否则，将新行全部粘贴到当前块下方
              const { newNormalBlockIds } =
                blockEditor.insertNormalBlocks({
                  pos: {
                    baseBlockId: blockId,
                    offset: 1,
                  },
                  blocks: lines.map((line) => ({
                    content: plainTextToTextContent(line),
                  })),
                  tr,
                  commit: false,
                }) ?? {};

              // 如果当前块为空，则删除当前块
              if (currBlockEmpty) {
                tr.deleteBlock(blockId);
              }

              tr.commit();

              if (tree) {
                await tree.nextUpdate();
                // 聚焦到插入的最后一个块，并将光标移至末尾
                const lastBlockId = newNormalBlockIds?.[newNormalBlockIds.length - 1];
                if (lastBlockId) {
                  await tree.focusBlock(lastBlockId);
                  const view = tree.getEditorView(lastBlockId);
                  if (view instanceof PmEditorView) {
                    const sel = AllSelection.atEnd(view.state.doc);
                    const tr = view.state.tr.setSelection(sel);
                    view.dispatch(tr);
                  }
                }
              }
              hrefToTitle(view);
            });
          }
          return true;
        }
        return true;
      },
    },
  });
};
