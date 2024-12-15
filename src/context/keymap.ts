import { createContext } from "@/utils/createContext";
import { EditorView, EditorView as PmEditorView } from "prosemirror-view";
import { base, keyName } from "w3c-keyname";
import type { KeyBinding as CmKeyBinding } from "@codemirror/view";
import { AllSelection, EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import { textContentFromString } from "@/utils/pm";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { toggleMark } from "prosemirror-commands";
import { useTaskQueue } from "@/plugins/taskQueue";
import LastFocusContext from "./lastFocus";
import BlocksContext from "./blocks-provider/blocks";
import {
  cursorCharLeft,
  cursorCharRight,
  cursorLineDown,
  cursorLineUp,
  deleteCharBackward,
  deleteCharForward,
  indentLess,
  indentMore,
  insertNewlineAndIndent,
} from "@codemirror/commands";
import { ref } from "vue";

export type KeyBinding<P extends Array<any> = any[]> = {
  run: (...params: P) => boolean;
  stopPropagation?: boolean;
  preventDefault?: boolean;
};

const mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false;

function normalizeKeyName(name: string) {
  // eslint-disable-next-line prefer-const
  let parts = name.split(/-(?!$)/),
    result = parts[parts.length - 1];
  if (result == "Space") result = " ";
  let alt, ctrl, shift, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true;
    else if (/^a(lt)?$/i.test(mod)) alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
    else if (/^s(hift)?$/i.test(mod)) shift = true;
    else if (/^mod$/i.test(mod)) {
      if (mac) meta = true;
      else ctrl = true;
    } else throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt) result = "Alt-" + result;
  if (ctrl) result = "Ctrl-" + result;
  if (meta) result = "Meta-" + result;
  if (shift) result = "Shift-" + result;
  return result;
}

function normalize(map: { [key: string]: KeyBinding }) {
  const copy: { [key: string]: KeyBinding } = Object.create(null);
  for (const prop in map) copy[normalizeKeyName(prop)] = map[prop];
  return copy;
}

function modifiers(name: string, event: KeyboardEvent, shift = true) {
  if (event.altKey) name = "Alt-" + name;
  if (event.ctrlKey) name = "Ctrl-" + name;
  if (event.metaKey) name = "Meta-" + name;
  if (shift && event.shiftKey) name = "Shift-" + name;
  return name;
}

export function generateKeydownHandler<
  HandlerParamsType extends Array<any> = any[],
  KeyBindingParamsType extends Array<any> = any[],
>(
  bindings: { [key: string]: KeyBinding<KeyBindingParamsType> },
  paramsGenerator: (...params: HandlerParamsType) => KeyBindingParamsType,
  keyboardEventGetter: (...params: HandlerParamsType) => KeyboardEvent,
): (...params: HandlerParamsType) => boolean {
  const map = normalize(bindings);
  return function (...params: HandlerParamsType) {
    // 生成 keyBinding 的参数
    const keyBindingParams = paramsGenerator(...params);
    const event = keyboardEventGetter(...params);
    let baseName;
    const name = keyName(event),
      direct = map[modifiers(name, event)];
    if (direct && direct.run(...keyBindingParams)) {
      direct.stopPropagation && event.stopPropagation();
      direct.preventDefault && event.preventDefault();
      return true;
    }
    // A character key
    if (name.length == 1 && name != " ") {
      if (event.shiftKey) {
        // In case the name was already modified by shift, try looking
        // it up without its shift modifier
        const noShift = map[modifiers(name, event, false)];
        if (noShift && noShift.run(...keyBindingParams)) {
          noShift.stopPropagation && event.stopPropagation();
          noShift.preventDefault && event.preventDefault();
          return true;
        }
      }
      if (
        (event.shiftKey || event.altKey || event.metaKey || name.charCodeAt(0) > 127) &&
        (baseName = base[event.keyCode]) &&
        baseName != name
      ) {
        // Try falling back to the keyCode when there's a modifier
        // active or the character produced isn't ASCII, and our table
        // produces a different name from the the keyCode. See #668,
        // #1060
        const fromCode = map[modifiers(baseName, event)];
        if (fromCode && fromCode.run(...keyBindingParams)) {
          fromCode.stopPropagation && event.stopPropagation();
          fromCode.preventDefault && event.preventDefault();
          return true;
        }
      }
    }
    const wildcard = bindings["*"];
    if (wildcard && wildcard.run(...keyBindingParams)) {
      wildcard.stopPropagation && event.stopPropagation();
      wildcard.preventDefault && event.preventDefault();
      return true;
    }
    return false;
  };
}

export type SimpleKeyBinding = KeyBinding<[KeyboardEvent]>;

export function generateKeydownHandlerSimple(bindings: { [key: string]: SimpleKeyBinding }) {
  return generateKeydownHandler<[KeyboardEvent], [KeyboardEvent]>(
    bindings,
    (event) => [event],
    (event) => event,
  );
}

const KeymapContext = createContext(() => {
  const taskQueue = useTaskQueue();
  const { lastFocusedBlock, lastFocusedBlockTree, lastFocusedEditorView, lastFocusedBlockId } =
    LastFocusContext.useContext();
  const { blockEditor, blocksManager } = BlocksContext.useContext();

  const prosemirrorKeymap = ref<{ [p: string]: KeyBinding }>({
    "Mod-z": {
      run: () => {
        blocksManager.undo();
        return true;
      },
      stopPropagation: true,
      preventDefault: true,
    },
    "Mod-Shift-z": {
      run: () => {
        blocksManager.redo();
        return true;
      },
      stopPropagation: true,
      preventDefault: true,
    },
    Enter: {
      run: () => {
        taskQueue.addTask(
          async () => {
            const block = lastFocusedBlock.value;
            const tree = lastFocusedBlockTree.value;
            const view = lastFocusedEditorView.value;
            if (!block || !tree || !(view instanceof PmEditorView)) return;

            const sel = view.state.selection;
            const docEnd = AllSelection.atEnd(view.state.doc);
            const rootBlockIds = tree.getRootBlockIds();
            const onRoot = rootBlockIds.includes(block.id);

            // 1. 在块末尾按 Enter，则在下方创建空块
            if (sel.eq(docEnd)) {
              const pos = onRoot
                ? blockEditor.normalizePos({
                    parentId: block.id,
                    childIndex: "last-space",
                  })
                : blockEditor.normalizePos({
                    baseBlockId: block.id,
                    offset: 1,
                  });
              if (!pos) return;
              (document.activeElement as HTMLElement).blur(); // 操作前先失去焦点，防止闪烁
              const { focusNext } =
                blockEditor.insertNormalBlock({
                  pos,
                  content: textContentFromString(""),
                }) ?? {};
              if (focusNext && tree) {
                await tree.nextUpdate();
                await tree.focusBlock(focusNext);
              }
            } else if (sel.head == 0) {
              // 2. 在块开头按 Enter，则在上方创建空块
              if (onRoot) return; // 不处理根块的情况
              const pos = blockEditor.normalizePos({
                baseBlockId: block.id,
                offset: 0,
              });
              if (!pos) return;
              (document.activeElement as HTMLElement).blur(); // 操作前先失去焦点，防止闪烁
              const { focusNext } =
                blockEditor.insertNormalBlock({ pos, content: textContentFromString("") }) ?? {};
              if (focusNext && tree) {
                await tree.nextUpdate();
                await tree.focusBlock(focusNext);
              }
            } else {
              // 3. 中间按 Enter，上面创建一个新块，将光标左边的内容挪到新块中
              if (onRoot) return; // 不处理根块的情况
              const curSel = view.state.selection;
              const docAbove = view.state.doc.cut(0, curSel.anchor);
              const newThisDoc = view.state.doc.cut(curSel.anchor);
              // 删去挪移到新块中的内容
              const tr = blocksManager.createBlockTransaction({ type: "ui" });
              blockEditor.changeBlockContent({
                blockId: block.id,
                content: [BLOCK_CONTENT_TYPES.TEXT, newThisDoc.toJSON()],
                tr,
                commit: false,
              });
              // 上方插入块
              const pos = blockEditor.normalizePos({
                baseBlockId: block.id,
                offset: 0,
              });
              if (!pos) return;
              blockEditor.insertNormalBlock({
                pos,
                content: [BLOCK_CONTENT_TYPES.TEXT, docAbove.toJSON()],
                tr,
                commit: false,
              });
              (document.activeElement as HTMLElement).blur(); // 操作前先失去焦点，防止闪烁
              tr.commit();

              if (tree) {
                await tree.nextUpdate();
                await tree.focusBlock(block.id);
                // 将光标移至开头
                const view = tree.getEditorView(block.id);
                if (view instanceof PmEditorView) {
                  const sel = AllSelection.atStart(view.state.doc);
                  const tr = view.state.tr.setSelection(sel);
                  view.dispatch(tr);
                }
              }
            }
          },
          { description: `Enter handler` },
        );
        return true;
      },
      stopPropagation: true,
    },
    "Shift-Enter": {
      run: (state: EditorState, dispatch: EditorView["dispatch"]) => {
        const brNode = pmSchema.nodes.hardBreak.create();
        const tr = state.tr.replaceSelectionWith(brNode);
        dispatch(tr);
        return true;
      },
      stopPropagation: true,
    },
    Backspace: {
      run: (state, dispatch) => {
        deleteUfeffBeforeCursor(state, dispatch!);

        taskQueue.addTask(
          async () => {
            const block = lastFocusedBlock.value;
            const tree = lastFocusedBlockTree.value;
            const view = lastFocusedEditorView.value;
            if (!block || !tree || !(view instanceof PmEditorView)) return;

            const blockAbove = tree.getBlockAbove(block.id);
            const blockBelow = tree.getBlockBelow(block.id);
            const focusNext = blockAbove?.id || blockBelow?.id;

            const sel = view.state.selection;
            // 1. 如果选中了东西，则执行默认逻辑（删除选区）
            if (!sel.empty) return;

            // 2. 当前块为空，直接删掉这个块
            if (view.state.doc.content.size == 0) {
              (document.activeElement as HTMLElement).blur(); // 操作前先失去焦点，防止闪烁
              blockEditor.deleteBlock({ blockId: block.id });
              if (focusNext && tree) {
                await tree.nextUpdate();
                await tree.focusBlock(focusNext);
                // 删掉这个块后，将光标移至 focusNext 末尾？
                const view = tree.getEditorView(focusNext);
                if (view instanceof PmEditorView) {
                  const sel = AllSelection.atEnd(view.state.doc);
                  const tr = view.state.tr.setSelection(sel);
                  view.dispatch(tr);
                }
              }
              return;
            } else if (sel.from == 0 && blockAbove) {
              // 3. 尝试将这个块与上一个块合并
              // 仅当上一个块也是文本块，与自己同级，并且没有孩子时允许合并
              if (
                blockAbove.content[0] != BLOCK_CONTENT_TYPES.TEXT ||
                blockAbove.childrenIds.length > 0 ||
                block.parentId != blockAbove.parentId
              )
                return;
              if (blockAbove.content[0] != BLOCK_CONTENT_TYPES.TEXT) return;
              (document.activeElement as HTMLElement).blur(); // 操作前先失去焦点，防止闪烁
              const aboveDoc = Node.fromJSON(pmSchema, blockAbove.content[1]);
              const thisDoc = view.state.doc;
              const newThisContent = aboveDoc.content.append(thisDoc.content);
              const newThisDoc = pmSchema.nodes.doc.create(null, newThisContent);
              const tr = blocksManager.createBlockTransaction({ type: "ui" });
              blockEditor.changeBlockContent({
                blockId: block.id,
                content: [BLOCK_CONTENT_TYPES.TEXT, newThisDoc.toJSON()],
                tr,
                commit: false,
              });
              blockEditor.deleteBlock({ blockId: blockAbove.id, tr, commit: false });
              tr.commit();
              if (tree) {
                await tree.nextUpdate();
                // 将光标移至正确位置
                const view = tree.getEditorView(block.id);
                if (view instanceof PmEditorView) {
                  const sel = TextSelection.create(view.state.doc, aboveDoc.content.size);
                  const tr = view.state.tr.setSelection(sel);
                  view.dispatch(tr);
                  view.focus();
                }
              }
              return;
            }
          },
          { description: `Backspace handler` },
        );
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    Delete: {
      run: (state, dispatch) => {
        deleteUfeffAfterCursor(state, dispatch!);

        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        const view = lastFocusedEditorView.value;
        if (!block || !tree || !(view instanceof PmEditorView)) return false;

        const blockAbove = tree.getBlockAbove(block.id);
        const blockBelow = tree.getBlockBelow(block.id);
        const focusNext = blockBelow?.id || blockAbove?.id;

        const sel = view.state.selection;
        const docEnd = AllSelection.atEnd(view.state.doc);
        // 1. 如果选中了东西，则执行默认逻辑（删除选区）
        if (!sel.empty) return false;

        // 2. 当前块为空，直接删掉这个块
        if (view.state.doc.content.size == 0) {
          taskQueue.addTask(async () => {
            blockEditor.deleteBlock({ blockId: block.id });
            if (focusNext && tree) {
              await tree.nextUpdate();
              await tree.focusBlock(focusNext);
            }
          });
          return true;
        } else if (sel.eq(docEnd) && blockBelow) {
          // 3. 如果下一个块是空块，则直接删除下一个块
          if (blockBelow.content[0] === BLOCK_CONTENT_TYPES.TEXT) {
            const belowDoc = Node.fromJSON(pmSchema, blockBelow.content[1]);
            if (belowDoc.content.size === 0) {
              taskQueue.addTask(async () => {
                blockEditor.deleteBlock({ blockId: blockBelow.id });
              });
              return true;
            }
          }
          // 4. 尝试将这个块与下一个块合并
          // 当下一个块也是文本块，与自己同级，并且自己没有孩子时允许合并
          if (
            blockBelow.content[0] !== BLOCK_CONTENT_TYPES.TEXT ||
            block.childrenIds.length > 0 ||
            block.parentId != blockBelow.parentId
          )
            return false;
          taskQueue.addTask(async () => {
            if (blockBelow.content[0] !== BLOCK_CONTENT_TYPES.TEXT) return;
            const belowDoc = Node.fromJSON(pmSchema, blockBelow.content[1]);
            const thisDoc = view.state.doc;
            const newBelowContent = thisDoc.content.append(belowDoc.content);
            const newBelowDoc = pmSchema.nodes.doc.create(null, newBelowContent);
            const tr = blocksManager.createBlockTransaction({ type: "ui" });
            blockEditor.changeBlockContent({
              blockId: block.id,
              content: [BLOCK_CONTENT_TYPES.TEXT, newBelowDoc.toJSON()],
              tr,
              commit: false,
            });
            blockEditor.deleteBlock({ blockId: blockBelow.id, tr, commit: false });
            tr.commit();
            if (tree) {
              await tree.nextUpdate();
              await tree.focusBlock(blockBelow.id);
              // 将光标移至正确位置
              const view = tree.getEditorView(block.id);
              if (view instanceof PmEditorView) {
                const sel = TextSelection.create(view.state.doc, thisDoc.content.size);
                const tr = view.state.tr.setSelection(sel);
                view.dispatch(tr);
              }
            }
          });
          return true;
        }
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-ArrowUp": {
      run: () => {
        taskQueue.addTask(async () => {
          const block = lastFocusedBlock.value;
          if (!block || block.fold) return;
          await blockEditor.toggleFold(block.id, true);
        });
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-ArrowDown": {
      run: () => {
        taskQueue.addTask(async () => {
          const block = lastFocusedBlock.value;
          if (!block || !block.fold) return;
          await blockEditor.toggleFold(block.id, false);
        });
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Alt-ArrowUp": {
      run: () => {
        taskQueue.addTask(async () => {
          const block = lastFocusedBlock.value;
          const tree = lastFocusedBlockTree.value;
          if (!block || !tree) return;

          const pos = blockEditor.normalizePos({
            baseBlockId: block.id,
            offset: -1,
          });
          if (!pos) return;
          const { focusNext } = blockEditor.moveBlock({ blockId: block.id, pos }) ?? {};

          if (focusNext && tree) {
            await tree.nextUpdate();
            tree.focusBlock(focusNext);
          }
        });
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    // 移动到父块
    "Mod-ArrowLeft": {
      run: () => {
        taskQueue.addTask(async () => {
          const block = lastFocusedBlock.value;
          const parent = block?.parentRef.value;
          if (!parent) return;
          const tree = lastFocusedBlockTree.value;
          if (!tree) return;
          tree.focusBlock(parent.id);
        });
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Alt-ArrowDown": {
      run: () => {
        taskQueue.addTask(async () => {
          const block = lastFocusedBlock.value;
          const tree = lastFocusedBlockTree.value;
          if (!block || !tree) return;

          const pos = blockEditor.normalizePos({
            baseBlockId: block.id,
            offset: 2,
          });
          if (!pos) return;
          const { focusNext } = blockEditor.moveBlock({ blockId: block.id, pos }) ?? {};

          if (focusNext && tree) {
            await tree.nextUpdate();
            tree.focusBlock(focusNext);
          }
        });
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    Tab: {
      run: () => {
        taskQueue.addTask(
          async () => {
            const block = lastFocusedBlock.value;
            const tree = lastFocusedBlockTree.value;
            if (!block || !tree) return;

            blockEditor.promoteBlock({ blockId: block.id });
            if (tree) {
              await tree.nextUpdate();
              tree.focusBlock(block.id);
            }
          },
          { description: `Tab handler` },
        );
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Shift-Tab": {
      run: () => {
        taskQueue.addTask(
          async () => {
            const block = lastFocusedBlock.value;
            const tree = lastFocusedBlockTree.value;
            if (!block || !tree) return;

            blockEditor.demoteBlock({ blockId: block.id });
            if (tree) {
              await tree.nextUpdate();
              tree.focusBlock(block.id);
            }
          },
          { description: `Shift-Tab handler` },
        );
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowUp: {
      run: () => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        const view = lastFocusedEditorView.value;
        if (!block || !tree || !(view instanceof PmEditorView)) return false;

        if (tree && view.endOfTextblock("up")) {
          const oldPos = view.state.selection.anchor;
          const coord = view.coordsAtPos(oldPos);
          const prevBlock = tree.getBlockAbove(block.id);
          if (!prevBlock) return false;
          tree.focusBlock(prevBlock.id);
          // 调整光标位置
          const newEditorView = tree.getEditorView(prevBlock.id);
          if (!(newEditorView instanceof PmEditorView)) return false;
          const newPos =
            newEditorView.posAtCoords({
              left: coord.left,
              top: coord.top - 10,
            })?.pos ?? oldPos;
          const maxPos = newEditorView.state.doc.content.size;
          const sel = TextSelection.create(newEditorView.state.doc, Math.min(newPos, maxPos));
          const tr = newEditorView.state.tr.setSelection(sel);
          newEditorView.dispatch(tr);
          return true;
        }
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowDown: {
      run: () => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        const view = lastFocusedEditorView.value;
        if (!block || !tree || !(view instanceof PmEditorView)) return false;

        if (tree && view.endOfTextblock("down")) {
          const oldPos = view.state.selection.anchor;
          const coord = view.coordsAtPos(oldPos);
          const nextBlock = tree.getBlockBelow(block.id);
          if (!nextBlock) return false;
          tree.focusBlock(nextBlock.id);
          // 调整光标位置
          const newEditorView = tree.getEditorView(nextBlock.id);
          if (!(newEditorView instanceof PmEditorView)) return false;
          const newPos =
            newEditorView.posAtCoords({
              left: coord.left,
              top: coord.top + 30,
            })?.pos ?? oldPos;
          const maxPos = newEditorView.state.doc.content.size;
          const sel = TextSelection.create(newEditorView.state.doc, Math.min(newPos, maxPos));
          const tr = newEditorView.state.tr.setSelection(sel);
          newEditorView.dispatch(tr);
          return true;
        }
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-m": {
      run: (state, dispatch, view) => {
        if (dispatch == null) return false;
        const node = pmSchema.nodes.mathInline.create({ src: "" });
        const tr = state.tr.replaceSelectionWith(node);
        const pos = tr.doc.resolve(
          tr.selection.anchor - (tr.selection as any).$anchor.nodeBefore.nodeSize,
        );
        tr.setSelection(new NodeSelection(pos));
        dispatch(tr);
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-Shift-m": {
      run: (state, dispatch, view) => {
        const empty = state.doc.content.size == 0;
        if (empty) {
          const tree = lastFocusedBlockTree.value;
          // 将这个空块变为公式块
          taskQueue.addTask(async () => {
            const blockId = lastFocusedBlockId.value;
            if (blockId == null) return;
            blockEditor.changeBlockContent({
              blockId: blockId,
              content: [BLOCK_CONTENT_TYPES.MATH, ""],
            });
            // 聚焦块
            if (tree) {
              await tree.nextUpdate();
              tree.focusBlock(blockId, { scrollIntoView: true });
            }
          });
        } else {
          // 下方插入公式块
          taskQueue.addTask(async () => {
            const blockId = lastFocusedBlockId.value;
            if (blockId == null) return;
            const pos = blockEditor.normalizePos({
              baseBlockId: blockId,
              offset: 1,
            });
            if (pos == null) return;
            const tree = lastFocusedBlockTree.value;
            const { focusNext } =
              blockEditor.insertNormalBlock({ pos, content: [BLOCK_CONTENT_TYPES.MATH, ""] }) ?? {};
            // 聚焦到刚插入的块
            if (tree && focusNext) {
              await tree.nextUpdate();
              tree.focusBlock(focusNext, { scrollIntoView: true });
            }
          });
        }
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowLeft: {
      run: (state, dispatch, view) => {
        skipOneUfeffBeforeCursor(state, dispatch!);
        const block = lastFocusedBlock.value;
        if (!block) return false;
        const tree = lastFocusedBlockTree.value;
        const atBeg = state.selection.empty && state.selection.anchor == 0;
        if (tree && atBeg) {
          const prevBlock = tree.getPredecessorBlock(block.id);
          if (!prevBlock) return false;
          tree.focusBlock(prevBlock.id);
          tree.moveCursorToTheEnd(prevBlock.id);
          return true;
        }
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowRight: {
      run: (state, dispatch, view) => {
        skipOneUfeffAfterCursor(state, dispatch!);
        const block = lastFocusedBlock.value;
        if (!block) return false;
        const tree = lastFocusedBlockTree.value;
        const atEnd = state.selection.empty && state.selection.anchor == state.doc.content.size;
        if (tree && atEnd) {
          const nextBlock = tree.getSuccessorBlock(block.id);
          if (!nextBlock) return false;
          tree.focusBlock(nextBlock.id);
          tree.moveCursorToTheEnd(nextBlock.id);
          return true;
        }
        return false;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-b": {
      run: toggleMark(pmSchema.marks.bold),
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-i": {
      run: toggleMark(pmSchema.marks.italic),
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-`": {
      run: toggleMark(pmSchema.marks.code),
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-=": {
      run: toggleMark(pmSchema.marks.highlight, { bg: "bg4" }),
      preventDefault: true,
      stopPropagation: true,
    },
  });

  const codemirrorKeymap = ref<{ [p: string]: CmKeyBinding }>({
    ArrowLeft: {
      key: "ArrowLeft",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const sel = view.state.selection;
        if (sel.ranges.length == 1) {
          const range0 = sel.ranges[0];
          if (range0.from == range0.to && range0.from == 0) {
            const blockId = block.id;
            const focusNext = tree?.getBlockAbove(blockId)?.id;
            if (focusNext && tree) {
              tree.focusBlock(focusNext);
              tree.moveCursorToTheEnd(focusNext);
            }
            return true;
          }
        }
        return cursorCharLeft(view);
      },
      stopPropagation: true,
    },
    ArrowRight: {
      key: "ArrowRight",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const docLength = view.state.doc.length;
        const sel = view.state.selection;
        if (sel.ranges.length == 1) {
          const range0 = sel.ranges[0];
          if (range0.from == range0.to && range0.from == docLength) {
            const blockId = block.id;
            const focusNext = tree?.getBlockBelow(blockId)?.id;
            if (focusNext && tree) {
              tree.focusBlock(focusNext);
              tree.moveCursorToBegin(focusNext);
            }
            return true;
          }
        }
        return cursorCharRight(view);
      },
      stopPropagation: true,
    },
    ArrowUp: {
      key: "ArrowUp",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const sel = view.state.selection;
        if (sel.ranges.length == 1) {
          const range0 = sel.ranges[0];
          if (range0.from == range0.to) {
            const selLine = view.state.doc.lineAt(range0.from).number;
            if (selLine == 1) {
              const blockId = block.id;
              const focusNext = tree?.getBlockAbove(blockId)?.id;
              if (focusNext && tree) {
                tree.focusBlock(focusNext);
              }
              return true;
            }
          }
        }
        return cursorLineUp(view);
      },
      stopPropagation: true,
    },
    ArrowDown: {
      key: "ArrowDown",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const lineNumber = view.state.doc.lines;
        const sel = view.state.selection;
        if (sel.ranges.length == 1) {
          const range0 = sel.ranges[0];
          if (range0.from == range0.to) {
            const selLine = view.state.doc.lineAt(range0.from).number;
            if (selLine == lineNumber) {
              const blockId = block.id;
              const focusNext = tree?.getBlockBelow(blockId)?.id;
              if (focusNext && tree) {
                tree.focusBlock(focusNext);
              }
              return true;
            }
          }
        }
        return cursorLineDown(view);
      },
      stopPropagation: true,
    },
    Backspace: {
      key: "Backspace",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const docLength = view.state.doc.length;
        if (docLength == 0) {
          const blockId = block.id;
          const focusNext = tree?.getBlockAbove(blockId)?.id;
          taskQueue.addTask(async () => {
            blockEditor.deleteBlock({ blockId });
            if (focusNext && tree) {
              await tree.nextUpdate();
              tree.focusBlock(focusNext);
            }
          });
          return true;
        }
        return deleteCharBackward(view);
      },
      stopPropagation: true,
    },
    Delete: {
      key: "Delete",
      run: (view) => {
        const block = lastFocusedBlock.value;
        const tree = lastFocusedBlockTree.value;
        if (!block || !tree) return false;
        const docLength = view.state.doc.length;
        if (docLength == 0) {
          const blockId = block.id;
          const focusNext = tree?.getBlockBelow(blockId)?.id;
          taskQueue.addTask(async () => {
            blockEditor.deleteBlock({ blockId });
            if (focusNext && tree) {
              await tree.nextUpdate();
              tree.focusBlock(focusNext);
            }
          });
          return true;
        }
        return deleteCharForward(view);
      },
      stopPropagation: true,
    },
    Tab: {
      key: "Tab",
      run: (view) => {
        return indentMore(view);
      },
      stopPropagation: true,
    },
    "Shift-Tab": {
      key: "Shift-Tab",
      run: (view) => {
        return indentLess(view);
      },
      stopPropagation: true,
    },
    Enter: {
      key: "Enter",
      run: (view) => {
        return insertNewlineAndIndent(view);
      },
      stopPropagation: true,
    },
  });

  const globalKeymap = ref<{ [p: string]: SimpleKeyBinding }>({});

  const getProsemirrorKeybinding = (key: string) => {
    return prosemirrorKeymap.value[key];
  };

  const getCodemirrorKeybinding = (key: string) => {
    return codemirrorKeymap.value[key];
  };

  const getGlobalKeybinding = (key: string) => {
    return globalKeymap.value[key];
  };

  const addProsemirrorKeybinding = (key: string, binding: KeyBinding) => {
    const keybinding = prosemirrorKeymap.value[key];
    if (keybinding) {
      throw new Error(`keybinding ${key} already exists`);
    }
    prosemirrorKeymap.value[key] = binding;
  };

  const addCodemirrorKeybinding = (key: string, binding: CmKeyBinding) => {
    const keybinding = codemirrorKeymap.value[key];
    if (keybinding) {
      throw new Error(`keybinding ${key} already exists`);
    }
    codemirrorKeymap.value[key] = binding;
  };

  const addGlobalKeybinding = (key: string, binding: SimpleKeyBinding) => {
    const keybinding = globalKeymap.value[key];
    if (keybinding) {
      throw new Error(`keybinding ${key} already exists`);
    }
    globalKeymap.value[key] = binding;
  };

  const removeProsemirrorKeybinding = (key: string) => {
    delete prosemirrorKeymap.value[key];
  };

  const removeCodemirrorKeybinding = (key: string) => {
    delete codemirrorKeymap.value[key];
  };

  const removeGlobalKeybinding = (key: string) => {
    delete globalKeymap.value[key];
  };

  const moveProsemirrorKeybinding = (to: string, from?: string, binding?: KeyBinding) => {
    const fromBinding = from ? prosemirrorKeymap.value[from] : undefined;
    const toBinding = prosemirrorKeymap.value[to];
    if (toBinding) {
      throw new Error(`keybinding ${to} already exists`);
    }
    const newBinding = fromBinding ?? binding;
    if (!newBinding) return;
    prosemirrorKeymap.value[to] = newBinding;
    if (from && fromBinding) {
      delete prosemirrorKeymap.value[from];
    }
  };

  const moveCodemirrorKeybinding = (to: string, from?: string, binding?: CmKeyBinding) => {
    const fromBinding = from ? codemirrorKeymap.value[from] : undefined;
    const toBinding = codemirrorKeymap.value[to];
    if (toBinding) {
      throw new Error(`keybinding ${to} already exists`);
    }
    const newBinding = fromBinding ?? binding;
    if (!newBinding) return;
    codemirrorKeymap.value[to] = newBinding;
    if (from && fromBinding) {
      delete codemirrorKeymap.value[from];
    }
  };

  const moveGlobalKeybinding = (to: string, from?: string, binding?: SimpleKeyBinding) => {
    const fromBinding = from ? globalKeymap.value[from] : undefined;
    const toBinding = globalKeymap.value[to];
    if (toBinding) {
      throw new Error(`keybinding ${to} already exists`);
    }
    const newBinding = fromBinding ?? binding;
    if (!newBinding) return;
    globalKeymap.value[to] = newBinding;
    if (from && fromBinding) {
      delete globalKeymap.value[from];
    }
  };

  const ctx = {
    prosemirrorKeymap,
    codemirrorKeymap,
    globalKeymap,
    getProsemirrorKeybinding,
    getCodemirrorKeybinding,
    getGlobalKeybinding,
    addProsemirrorKeybinding,
    addCodemirrorKeybinding,
    addGlobalKeybinding,
    removeProsemirrorKeybinding,
    removeCodemirrorKeybinding,
    removeGlobalKeybinding,
    moveProsemirrorKeybinding,
    moveCodemirrorKeybinding,
    moveGlobalKeybinding,
  };
  // 通过 globalThis 暴露给组件外使用
  globalThis.getKeymapContext = () => ctx;
  return ctx;
});

// helper functions
const skipOneUfeffAfterCursor = (state: EditorState, dispatch: EditorView["dispatch"]) => {
  if (dispatch == null) return false;
  const sel = state.selection;
  try {
    const charAfter = state.doc.textBetween(sel.from, sel.from + 1);
    if (charAfter == "\ufeff") {
      // console.log('skip \\ufeff')
      const tr = state.tr.setSelection(TextSelection.create(state.doc, sel.from + 1));
      dispatch(tr);
      return true;
    }
  } catch (_) {}
  return false;
};

const skipOneUfeffBeforeCursor = (state: EditorState, dispatch: EditorView["dispatch"]) => {
  if (dispatch == null) return false;
  const sel = state.selection;
  const charBefore = state.doc.textBetween(sel.from - 1, sel.from);
  if (charBefore == "\ufeff") {
    const tr = state.tr.setSelection(TextSelection.create(state.doc, sel.from - 1));
    dispatch(tr);
    return true;
  }
  return false;
};

const deleteUfeffAfterCursor = (state: EditorState, dispatch: EditorView["dispatch"]) => {
  const selection = state.selection;
  try {
    const charAfter = state.doc.textBetween(selection.from, selection.from + 1);
    if (charAfter == "\ufeff") {
      // console.log('skip \\ufeff')
      const tr = state.tr.delete(selection.from, selection.from + 1);
      dispatch(tr);
    }
  } catch (_) {
    /* empty */
  }
};

const deleteUfeffBeforeCursor = (state: EditorState, dispatch: EditorView["dispatch"]) => {
  if (dispatch == null) return false;
  const selection = state.selection;
  const charBefore = state.doc.textBetween(selection.from - 1, selection.from);
  if (charBefore == "\ufeff") {
    const tr = state.tr.delete(selection.from - 1, selection.from);
    dispatch(tr);
  }
};

export default KeymapContext;
