import { generateKeydownHandler, type KeyBinding } from "@/context/keymap";
import { type EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { computed } from "vue";

type PmBindingParamsType = [EditorState, EditorView["dispatch"]?, EditorView?];
type PmHandlerParamsType = [EditorView, KeyboardEvent];
type PmKeyBinding = KeyBinding<PmBindingParamsType>;

export const mkKeymapPlugin = () => {
  const keymaps = globalThis.getKeymapContext();

  // 写成这样是为了在 keymap.prosemirrorKeymap 变化时，handler 自动更新
  const handler = computed(() => generateKeydownHandler<PmHandlerParamsType, PmBindingParamsType>(
    keymaps!.prosemirrorKeymap.value,
    (view) => [view.state, view.dispatch, view],
    (_, event) => event,
  ));

  return new Plugin({
    props: {
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
        handler.value(view, event);
      }
    },
  });
}