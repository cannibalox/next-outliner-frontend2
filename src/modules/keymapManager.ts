import { defineModule } from "@/common/module";
import { EditorView as PmEditorView } from "prosemirror-view";
import { base, keyName } from "w3c-keyname";
import type { KeyBinding as CmKeyBinding } from "@codemirror/view";
import { taskQueue } from "./taskQueue";
import { globalEnv } from "@/main";
import { AllSelection } from "prosemirror-state";
import { blockEditor } from "./blockEditor";
import { textContentFromString } from "@/utils/pm";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";

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
export const keymapManager = defineModule("keymapManager", { taskQueue, blockEditor }, ({ taskQueue, blockEditor }) => {
  const prosemirrorKeymap: { [p: string]: KeyBinding } = {
    Enter: {
      run: () => {
        taskQueue.addTask(async () => {
          const {globalUiVars} = globalEnv;
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
            const { focusNext } = blockEditor.insertNormalBlock(pos, textContentFromString("")) ?? {};
            if (focusNext && tree) {
              await tree.nextUpdate();
              // TODO focus to focusNext
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
              // TODO focus to focusNext
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
            blockEditor.insertNormalBlock(
              pos,
              [BLOCK_CONTENT_TYPES.TEXT, docAbove.toJSON()],
            );
            // 将光标移至开头
            if (tree) {
              await tree.nextUpdate();
              // TODO focus to block
              const view = tree.getEditorView(block.id);
              if (view instanceof PmEditorView) {
                const sel = AllSelection.atStart(view.state.doc);
                const tr = view.state.tr.setSelection(sel);
                view.dispatch(tr);
              }
            }
          }
        });
        return true;
      },
      stopPropagation: true,
    },
  };

  const codemirrorKeymap: CmKeyBinding[] = [];

  return {
    prosemirrorKeymap,
    codemirrorKeymap,
  };
});
