import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

export const mkListenDocChangedPlugin = () => {
  let _view: EditorView | null = null;

  return new Plugin({
    view: (view) => {
      _view = view;
      return {};
    },
    state: {
      init: () => {},
      apply: (tr, value, oldState, newState) => {
        if (!_view?.emit) return;
        if (tr.docChanged) {
          const oldSelection = oldState.selection.toJSON();
          const newSelection = newState.selection.toJSON();
          const newDoc = newState.doc.toJSON();
          const oldDoc = oldState.doc.toJSON();
          _view.emit("docChanged", {
            newDoc,
            oldDoc,
            view: _view,
            oldSelection,
            newSelection,
          });
        }
      },
    },
  });
};
