import { defineModule } from "@/common/module";
import { EditorView, EditorView as PmEditorView } from "prosemirror-view";
import { base, keyName } from "w3c-keyname";
import type { KeyBinding as CmKeyBinding } from "@codemirror/view";
import { taskQueue } from "./taskQueue";
import { globalEnv } from "@/main";
import { AllSelection, EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import { blockEditor } from "./blockEditor";
import { textContentFromString } from "@/utils/pm";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { globalUiVars } from "./globalUiVars";
import { toggleMark } from "prosemirror-commands";

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

/**
 * keybinding 管理模块
 */
export const keymapManager = defineModule(
  "keymapManager",
  { taskQueue, blockEditor, globalUiVars },
  ({ taskQueue, blockEditor, globalUiVars }) => {
    const prosemirrorKeymap: { [p: string]: KeyBinding } = {
      Enter: {
        run: () => {
          taskQueue.addTask(
            async () => {
              const { globalUiVars } = globalEnv;
              const block = globalUiVars.lastFocusedBlock.value;
              const tree = globalUiVars.lastFocusedBlockTree.value;
              const view = globalUiVars.lastFocusedEditorView.value;
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
                const { focusNext } =
                  blockEditor.insertNormalBlock(pos, textContentFromString("")) ?? {};
                if (focusNext && tree) {
                  await tree.nextUpdate();
                  tree.focusBlock(focusNext);
                }
              } else if (sel.head == 0) {
                // 2. 在块开头按 Enter，则在上方创建空块
                if (onRoot) return; // 不处理根块的情况
                const pos = blockEditor.normalizePos({
                  baseBlockId: block.id,
                  offset: 0,
                });
                if (!pos) return;
                const { focusNext } =
                  blockEditor.insertNormalBlock(pos, textContentFromString("")) ?? {};
                if (focusNext && tree) {
                  await tree.nextUpdate();
                  tree.focusBlock(focusNext);
                }
              } else {
                // 3. 中间按 Enter，上面创建一个新块，将光标左边的内容挪到新块中
                if (onRoot) return; // 不处理根块的情况
                const curSel = view.state.selection;
                const docAbove = view.state.doc.cut(0, curSel.anchor);
                const newThisDoc = view.state.doc.cut(curSel.anchor);
                // 删去挪移到新块中的内容
                blockEditor.changeBlockContent(block.id, [
                  BLOCK_CONTENT_TYPES.TEXT,
                  newThisDoc.toJSON(),
                ]);
                // 上方插入块
                const pos = blockEditor.normalizePos({
                  baseBlockId: block.id,
                  offset: 0,
                });
                if (!pos) return;
                blockEditor.insertNormalBlock(pos, [BLOCK_CONTENT_TYPES.TEXT, docAbove.toJSON()]);

                if (tree) {
                  await tree.nextUpdate();
                  tree.focusBlock(block.id);
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
      Backspace: {
        run: (state, dispatch) => {
          deleteUfeffBeforeCursor(state, dispatch!);

          taskQueue.addTask(
            async () => {
              const { globalUiVars } = globalEnv;
              const block = globalUiVars.lastFocusedBlock.value;
              const tree = globalUiVars.lastFocusedBlockTree.value;
              const view = globalUiVars.lastFocusedEditorView.value;
              if (!block || !tree || !(view instanceof PmEditorView)) return;

              const blockAbove = tree.getBlockAbove(block.id);
              const blockBelow = tree.getBlockBelow(block.id);
              const focusNext = blockAbove?.id || blockBelow?.id;

              const sel = view.state.selection;
              // 1. 如果选中了东西，则执行默认逻辑（删除选区）
              if (!sel.empty) return;

              // 2. 当前块为空，直接删掉这个块
              if (view.state.doc.content.size == 0) {
                blockEditor.deleteBlock(block.id);
                if (focusNext && tree) {
                  await tree.nextUpdate();
                  tree.focusBlock(focusNext);
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
                const aboveDoc = Node.fromJSON(pmSchema, blockAbove.content[1]);
                const thisDoc = view.state.doc;
                const newThisContent = aboveDoc.content.append(thisDoc.content);
                const newThisDoc = pmSchema.nodes.doc.create(null, newThisContent);
                blockEditor.changeBlockContent(block.id, [
                  BLOCK_CONTENT_TYPES.TEXT,
                  newThisDoc.toJSON(),
                ]);
                blockEditor.deleteBlock(blockAbove.id);
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
        stopPropagation: true,
      },
      Delete: {
        run: (state, dispatch) => {
          deleteUfeffAfterCursor(state, dispatch!);

          const block = globalUiVars.lastFocusedBlock.value;
          const tree = globalUiVars.lastFocusedBlockTree.value;
          const view = globalUiVars.lastFocusedEditorView.value;
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
              blockEditor.deleteBlock(block.id);
              if (focusNext && tree) {
                await tree.nextUpdate();
                await tree.focusBlock(focusNext);
              }
            });
            return true;
          } else if (sel.eq(docEnd) && blockBelow) {
            // 3. 尝试将这个块与下一个块合并
            // 仅当下一个块也是文本块，与自己同级，并且自己没有孩子时允许合并
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
              blockEditor.changeBlockContent(block.id, [
                BLOCK_CONTENT_TYPES.TEXT,
                newBelowDoc.toJSON(),
              ]);
              blockEditor.deleteBlock(blockBelow.id);
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
        stopPropagation: true,
      },
      "Mod-ArrowUp": {
        run: () => {
          taskQueue.addTask(async () => {
            const block = globalUiVars.lastFocusedBlock.value;
            if (!block || block.fold) return;
            await blockEditor.toggleFold(block.id, true);
          });
          return true;
        },
        stopPropagation: true,
      },
      "Mod-ArrowDown": {
        run: () => {
          taskQueue.addTask(async () => {
            const block = globalUiVars.lastFocusedBlock.value;
            if (!block || !block.fold) return;
            await blockEditor.toggleFold(block.id, false);
          });
          return true;
        },
        stopPropagation: true,
      },
      "Alt-ArrowUp": {
        run: () => {
          taskQueue.addTask(async () => {
            const { globalUiVars } = globalEnv;
            const block = globalUiVars.lastFocusedBlock.value;
            const tree = globalUiVars.lastFocusedBlockTree.value;
            if (!block || !tree) return;

            const pos = blockEditor.normalizePos({
              baseBlockId: block.id,
              offset: -1,
            });
            if (!pos) return;
            const { focusNext } = blockEditor.moveBlock(block.id, pos) ?? {};
            
            if (focusNext && tree) {
              await tree.nextUpdate();
              tree.focusBlock(focusNext);
            }
          });
          return true;
        },
        stopPropagation: true,
      },
      "Alt-ArrowDown": {
        run: () => {
          taskQueue.addTask(async () => {
            const { globalUiVars } = globalEnv;
            const block = globalUiVars.lastFocusedBlock.value;
            const tree = globalUiVars.lastFocusedBlockTree.value;
            if (!block || !tree) return;

            const pos = blockEditor.normalizePos({
              baseBlockId: block.id,
              offset: 2,
            });
            if (!pos) return;
            const { focusNext } = blockEditor.moveBlock(block.id, pos) ?? {};
            
            if (focusNext && tree) {
              await tree.nextUpdate();
              tree.focusBlock(focusNext);
            }
          });
          return true;
        },
        stopPropagation: true,
      },
      Tab: {
        run: () => {
          taskQueue.addTask(
            async () => {
              const { globalUiVars } = globalEnv;
              const block = globalUiVars.lastFocusedBlock.value;
              const tree = globalUiVars.lastFocusedBlockTree.value;
              if (!block || !tree) return;

              blockEditor.promoteBlock(block.id);
              if (tree) {
                await tree.nextUpdate();
                tree.focusBlock(block.id);
              }
            },
            { description: `Tab handler` },
          );
          return true;
        },
        stopPropagation: true,
      },
      "Shift-Tab": {
        run: () => {
          taskQueue.addTask(
            async () => {
              const { globalUiVars } = globalEnv;
              const block = globalUiVars.lastFocusedBlock.value;
              const tree = globalUiVars.lastFocusedBlockTree.value;
              if (!block || !tree) return;

              blockEditor.demoteBlock(block.id);
              if (tree) {
                await tree.nextUpdate();
                tree.focusBlock(block.id);
              }
            },
            { description: `Shift-Tab handler` },
          );
          return true;
        },
        stopPropagation: true,
      },
      ArrowUp: {
        run: () => {
          const { globalUiVars } = globalEnv;
          const block = globalUiVars.lastFocusedBlock.value;
          const tree = globalUiVars.lastFocusedBlockTree.value;
          const view = globalUiVars.lastFocusedEditorView.value;
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
        stopPropagation: true,
      },
      ArrowDown: {
        run: () => {
          const { globalUiVars } = globalEnv;
          const block = globalUiVars.lastFocusedBlock.value;
          const tree = globalUiVars.lastFocusedBlockTree.value;
          const view = globalUiVars.lastFocusedEditorView.value;
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

        stopPropagation: true,
      },
      "Mod-Shift-m": {
        run: (state, dispatch, view) => {
          const empty = state.doc.content.size == 0;
          if (empty) {
            // 将这个空块变为公式块
            taskQueue.addTask(() => {
              const blockId = globalUiVars.lastFocusedBlockId.value;
              if (blockId == null) return;
              blockEditor.changeBlockContent(blockId, [BLOCK_CONTENT_TYPES.MATH, ""]);
            });
          } else {
            // 下方插入公式块
            taskQueue.addTask(async () => {
              const blockId = globalUiVars.lastFocusedBlockId.value;
              if (blockId == null) return;
              const pos = blockEditor.normalizePos({
                baseBlockId: blockId,
                offset: 1,
              });
              if (pos == null) return;
              const tree = globalUiVars.lastFocusedBlockTree.value;
              const { focusNext } =
                blockEditor.insertNormalBlock(pos, [BLOCK_CONTENT_TYPES.MATH, ""]) ?? {};
              // 聚焦到刚插入的块
              if (tree && focusNext) {
                await tree.nextUpdate();
                tree.focusBlock(focusNext, { scrollIntoView: true });
              }
            });
          }
          return true;
        },
        stopPropagation: true,
      },
      ArrowLeft: {
        run: (state, dispatch, view) => {
          skipOneUfeffBeforeCursor(state, dispatch!);
          const block = globalUiVars.lastFocusedBlock.value;
          if (!block) return false;
          const tree = globalUiVars.lastFocusedBlockTree.value;
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
        stopPropagation: true,
      },
      ArrowRight: {
        run: (state, dispatch, view) => {
          skipOneUfeffAfterCursor(state, dispatch!);
          const block = globalUiVars.lastFocusedBlock.value;
          if (!block) return false;
          const tree = globalUiVars.lastFocusedBlockTree.value;
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
        stopPropagation: true,
      },
      "Mod-b": {
        run: toggleMark(pmSchema.marks.bold),
        stopPropagation: true,
      },
      "Mod-i": {
        run: toggleMark(pmSchema.marks.italic),
        stopPropagation: true,
      },
      "Mod-`": {
        run: toggleMark(pmSchema.marks.code),
        stopPropagation: true,
      },
      "Mod-=": {
        run: toggleMark(pmSchema.marks.highlight, { bg: "bg4" }),
        stopPropagation: true,
      }
    };

    const codemirrorKeymap: CmKeyBinding[] = [];

    return {
      prosemirrorKeymap,
      codemirrorKeymap,
    };
  },
);

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
