import { createContext } from "@/utils/createContext";
import { computed, ref } from "vue";
import LastFocusContext from "./lastFocus";
import { EditorView as PmEditorView } from "prosemirror-view";
import { EditorView as CmEditorView } from "codemirror";
import MainTreeContext from "./mainTree";
import BlockTreeContext from "./blockTree";
import { Selection } from "prosemirror-state";
import { EditorSelection } from "@codemirror/state";

export type HistoryItem = {
  focusedBlockId: string;
  rootBlockId: string;
  selection: any; // JSONfied selection
};

const HistoryContext = createContext(() => {
  const historyItems = ref<HistoryItem[]>([]);
  const currentIndex = ref(0);

  const canGoPrev = computed(() => currentIndex.value > 0);
  const canGoNext = computed(() => currentIndex.value < historyItems.value.length);

  const { mainRootBlockId } = MainTreeContext.useContext();
  const { getBlockTree } = BlockTreeContext.useContext();
  const { lastFocusedBlockId, lastFocusedEditorView } = LastFocusContext.useContext();

  const captureHistoryItem = (): HistoryItem | null => {
    if (!lastFocusedBlockId.value) return null;
    const selection = !lastFocusedEditorView.value
      ? null
      : lastFocusedEditorView.value instanceof PmEditorView ||
          lastFocusedEditorView.value instanceof CmEditorView
        ? lastFocusedEditorView.value.state.selection.toJSON()
        : null;
    return {
      focusedBlockId: lastFocusedBlockId.value,
      rootBlockId: mainRootBlockId.value,
      selection,
    };
  };

  const pushHistoryItem = (item?: HistoryItem) => {
    item ??= captureHistoryItem() ?? undefined;
    if (!item) return;
    // 移除当前位置及之后的所有历史记录
    historyItems.value.splice(currentIndex.value);
    historyItems.value.push(item);
    // 指针移动到新的栈顶空位
    currentIndex.value = historyItems.value.length;
  };

  const goToHistoryItem = (item: HistoryItem) => {
    // 恢复根块
    mainRootBlockId.value = item.rootBlockId;
    const tree = getBlockTree("main");
    if (!tree) return;
    // 聚焦到 item 中指定的块，并恢复 selection
    tree.focusBlock(item.focusedBlockId, { highlight: true, expandIfFold: true });
    // 恢复 selection 会导致一些奇怪的 bug，暂时禁用
    // tree.nextUpdate(() => {
    //   const view = tree.getEditorView(item.focusedBlockId);
    //   if (view instanceof PmEditorView) {
    //     const sel = Selection.fromJSON(view.state.doc, item.selection);
    //     const tr = view.state.tr.setSelection(sel);
    //     view.dispatch(tr);
    //   } else if (view instanceof CmEditorView) {
    //     view.dispatch({
    //       selection: EditorSelection.fromJSON(item.selection),
    //     });
    //   }
    // });
  };

  const goPrev = () => {
    if (currentIndex.value <= 0) return;
    // 记录来时的位置
    const fromItem =
      currentIndex.value === historyItems.value.length ? captureHistoryItem() : undefined;
    currentIndex.value--;
    goToHistoryItem(historyItems.value[currentIndex.value]);
    fromItem && historyItems.value.push(fromItem);
  };

  const goNext = () => {
    if (currentIndex.value >= historyItems.value.length) return;
    currentIndex.value++;
    goToHistoryItem(historyItems.value[currentIndex.value]);
  };

  const ctx = {
    historyItems,
    currentIndex,
    pushHistoryItem,
    goPrev,
    goNext,
    canGoPrev,
    canGoNext,
  };
  globalThis.getHistoryContext = () => ctx;
  return ctx;
});

export default HistoryContext;
