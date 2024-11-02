import { generateKeydownHandler, type KeyBinding } from "@/context/keymap";
import { type EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

type PmBindingParamsType = [EditorState, EditorView["dispatch"]?, EditorView?];
type PmHandlerParamsType = [EditorView, KeyboardEvent];
type PmKeyBinding = KeyBinding<PmBindingParamsType>;

const keymap = (bindings: { [key: string]: PmKeyBinding }): Plugin => {
  const handler = generateKeydownHandler<PmHandlerParamsType, PmBindingParamsType>(
    bindings,
    (view) => [view.state, view.dispatch, view],
    (_, event) => event,
  );

  return new Plugin({
    props: {
      handleKeyDown: handler,
    },
  });
};

export const mkKeymapPlugin = () => {
  const keymaps = globalThis.getKeymapContext();
  return keymap(keymaps?.prosemirrorKeymap ?? {});
};