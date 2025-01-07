import { shallowReactive } from "vue";
import type { BlockOrigin, BlockTransaction } from "./blocksManager";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { useEventBus } from "@/plugins/eventbus";
import { EditorView as PmEditorView } from "prosemirror-view";
import { EditorView as CmEditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { Selection } from "prosemirror-state";

type UndoManagerCtx = {
  createBlockTransaction: (origin: BlockOrigin) => BlockTransaction;
};

// 记录事务开始或结束时的一些状态
// 用于撤销 & 重做
type TransactionEnvInfo = {
  rootBlockId: BlockId;
  focusedBlockId: BlockId | null;
  selection: any;
  [key: string]: any;
};

function createUndoManager(ctx: UndoManagerCtx) {
  const { createBlockTransaction } = ctx;
  const eventBus = useEventBus();
  // 记录所有事务，以及事务开始和结束时的一些状态
  const blockTransactions = shallowReactive(<BlockTransaction[]>[]);
  // 每个撤销点是一个下标，指向 blockTransactions 中的一个 “空位”
  // | tr1 | tr2 | tr3 tr4 | tr5 tr6 tr7 |
  // 上例中，撤销点是 0, 1 ,2 ,4, 7
  // 如果将撤销点从 4 移动到 2，那么会撤销事务 tr7 - tr3，并回复 tr3 开始时的状态
  // 如果将撤销点从 2 移动回 4，那么会重做事务 tr3 - tr7，并回复 tr7 结束时的状态
  const undoPoints = shallowReactive(<number[]>[]);
  // 当前撤销点
  let currPoint = 0;

  const clearUndoRedoHistory = () => {
    undoPoints.length = 0;
    blockTransactions.length = 0;
    currPoint = 0;
  };

  const addUndoPoint = () => {
    const index = blockTransactions.length;
    undoPoints.push(index);
  };

  eventBus.on("afterBlocksTrCommit", ([tr]) => {
    if (!tr.meta.isUndoRedo && tr.meta.canUndo) {
      blockTransactions.length = currPoint; // 新的事务会使 currPoint 后面的所有事务失效
      blockTransactions.push(tr);
      currPoint = blockTransactions.length;

      // 如果事务需要添加到 undoPoints，则添加
      if (tr.meta.autoAddUndoPoint) {
        addUndoPoint();
      }
    }

    // 如果执行了一个无法撤销的事务，则清空撤销历史（撤销时无法越过这个事务）
    // meta.canUndo 为 false，以及非本地的事务被认为是无法撤销的
    if (!tr.meta.canUndo || tr.origin.type !== "ui") {
      clearUndoRedoHistory();
    }
  });

  const undo = () => {
    // 如果最后一个 undoPoint 不是 currPoint
    // 将 currPoint 作为新 undoPoint 插入
    // 让之后可以重做回当前状态
    const lastUndoPoint = undoPoints[undoPoints.length - 1];
    if (currPoint > lastUndoPoint) {
      undoPoints.push(currPoint);
    }

    // 计算要撤回到哪个 undoPoint
    const index = undoPoints.indexOf(currPoint);
    if (index == -1 || index == 0) return;
    const targetUndoPoint = undoPoints[index - 1]; // 撤销到前一个 undoPoint
    const trsToApply = [...blockTransactions.slice(targetUndoPoint, currPoint)];
    trsToApply.reverse();

    // 先让当前元素失去焦点，防止光标乱跳
    (document.activeElement as HTMLElement)?.blur();

    // 将之前要撤销的事务合并为一个块事务
    const undoTr = createBlockTransaction({ type: "ui" }).setMeta("isUndoRedo", true);
    for (const tr of trsToApply) {
      undoTr.addReverseTransaction(tr);
    }
    undoTr.commit();

    // 恢复其他状态
    // 恢复到第一个事务之前的状态
    const targetEnvInfo =
      trsToApply[0].meta.envUndoStrategy === "beforeCommit"
        ? trsToApply[0].envInfo.beforeCommit
        : trsToApply[0].envInfo.onCreate;
    const { rootBlockId, focusedTreeId, focusedItemId, selection } = targetEnvInfo ?? {};

    // 这里先让 ProseMirror 更新 state，然后恢复 focusedBlockId 和 selection
    setTimeout(() => {
      try {
        // 恢复 rootBlockId
        const { mainRootBlockId } = getMainTreeContext()!;
        mainRootBlockId.value = rootBlockId;

        const { getBlockTree } = getBlockTreeContext()!;
        if (focusedTreeId) {
          const tree = getBlockTree(focusedTreeId);
          if (tree) {
            // 恢复 focusedItem 和 selection
            if (focusedItemId) {
              tree.focusDi(focusedItemId);
              if (selection != null) {
                const editorView = tree.getEditorView(focusedItemId);
                if (editorView instanceof PmEditorView) {
                  const sel = Selection.fromJSON(editorView.state.doc, selection);
                  const tr = editorView.state.tr.setSelection(sel);
                  editorView.dispatch(tr);
                } else if (editorView instanceof CmEditorView) {
                  const sel = EditorSelection.fromJSON(selection);
                  editorView.dispatch({
                    selection: sel,
                  });
                }
              }
            }
          }
        }
      } catch {}
    });

    // 更新 currPoint
    currPoint = targetUndoPoint;
  };

  const redo = () => {
    // 计算要重做到的 undoPoint
    const index = undoPoints.indexOf(currPoint);
    if (index == -1) return;
    if (index == undoPoints.length - 1) {
      console.warn("Already reached the last state, cannot redo");
      return;
    }
    const targetUndoPoint = undoPoints[index + 1];
    const trsToApply = [...blockTransactions.slice(currPoint, targetUndoPoint)];

    // 先让当前元素失去焦点，防止光标乱跳
    (document.activeElement as HTMLElement)?.blur();

    // 将之前要重做的事务合并为一个块事务
    const redoTr = createBlockTransaction({ type: "ui" }).setMeta("isUndoRedo", true);
    for (const tr of trsToApply) {
      redoTr.addTransaction(tr);
    }
    redoTr.commit();

    // 恢复其他状态
    // 恢复到最后一个事务结束时的状态
    const targetEnvInfo =
      trsToApply[0].meta.envUndoStrategy === "beforeCommit"
        ? trsToApply[0].envInfo.beforeCommit
        : trsToApply[0].envInfo.onCreate;
    const { rootBlockId, focusedTreeId, focusedItemId, selection } = targetEnvInfo ?? {};

    // 这里先让 ProseMirror 更新 state，然后恢复 focusedBlockId 和 selection
    setTimeout(() => {
      try {
        // 恢复 rootBlockId
        const { mainRootBlockId } = getMainTreeContext()!;
        mainRootBlockId.value = rootBlockId;

        const { getBlockTree } = getBlockTreeContext()!;
        if (focusedTreeId) {
          const tree = getBlockTree(focusedTreeId);
          if (tree) {
            // 恢复 focusedItem 和 selection
            if (focusedItemId) {
              tree.focusDi(focusedItemId);
              if (selection != null) {
                const editorView = tree.getEditorView(focusedItemId);
                if (editorView instanceof PmEditorView) {
                  const sel = Selection.fromJSON(editorView.state.doc, selection);
                  const tr = editorView.state.tr.setSelection(sel);
                  editorView.dispatch(tr);
                } else if (editorView instanceof CmEditorView) {
                  const sel = EditorSelection.fromJSON(selection);
                  editorView.dispatch({
                    selection: sel,
                  });
                }
              }
            }
          }
        }
      } catch {}
    });

    // 更新 currPoint
    currPoint = targetUndoPoint;
  };

  return { undo, redo, addUndoPoint, clearUndoRedoHistory };
}

export default createUndoManager;
