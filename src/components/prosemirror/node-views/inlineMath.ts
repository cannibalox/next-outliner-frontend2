import type FloatingMathInputContext from "@/context/floatingMathInput";
import katex, { type KatexOptions } from "katex";
import { Node } from "prosemirror-model";
import { AllSelection, NodeSelection, TextSelection } from "prosemirror-state";
import { EditorView as PmEditorView } from "prosemirror-view";

type CTX = ReturnType<typeof FloatingMathInputContext.useContext>;

export class MathInlineKatex {
  readonly dom: HTMLSpanElement;
  private readonly pmView: PmEditorView;
  private readonly getPos: Function;
  private readonly katexContainer: HTMLSpanElement;
  private readonly ctx: CTX;
  private readonly onBlur: Function = (_: any) => {
    this.deselect();
  };

  private src: string = "";

  // Katex 渲染选项
  private static readonly KATEX_RENDER_OPTION: KatexOptions = {
    displayMode: false,
    throwOnError: false,
  };

  // 类名
  private static readonly KATEX_CONTAINER_CLASS = "math-inline--katex";

  private renderEquation() {
    if (this.src.trim().length > 0) {
      katex.render(this.src, this.katexContainer, MathInlineKatex.KATEX_RENDER_OPTION);
      this.katexContainer.classList.remove("empty");
    } else {
      // 空公式
      this.katexContainer.textContent = "EMPTY EQUATION";
      this.katexContainer.classList.add("empty");
    }
  }

  private showMathEditor() {
    const node = this.pmView.state.doc.nodeAt(this.getPos());
    if (!node) return; // TODO: 这里不应该为空
    const src = node.attrs.src;
    this.ctx!.openFloatingMathInput(
      this.katexContainer,
      src,
      (newSrc: string) => {
        // 公式更新后，重新渲染
        this.src = newSrc;
        this.renderEquation();
      },
      () => this.skipLeft(),
      () => this.skipRight(),
      () => this.skipRight(),
      () => this.deleteThisNode(),
    );
  }

  private syncToProseMirror() {
    // 将更新后的公式写回 node 中
    const pos = this.getPos();
    const schema = this.pmView.state.schema;
    const newNode = schema.nodes.mathInline.create({ src: this.src });
    const tr = this.pmView.state.tr.replaceRangeWith(pos, pos + 1, newNode);
    tr.setSelection(NodeSelection.create(tr.doc, pos)); // 保持选中状态
    return tr;
  }

  private skipRight() {
    const pos = this.getPos();
    const tr = this.syncToProseMirror();
    let sel;
    try {
      sel = TextSelection.create(tr.doc, pos + 1);
    } catch (e) {
      sel = AllSelection.atEnd(tr.doc);
    }
    tr.setSelection(sel);
    this.pmView.dispatch(tr);
    this.pmView.focus();
  }

  private skipLeft() {
    const pos = this.getPos();
    const tr = this.syncToProseMirror();
    let sel;
    try {
      sel = TextSelection.create(tr.doc, pos - 1);
    } catch (e) {
      sel = AllSelection.atStart(tr.doc);
    }
    tr.setSelection(sel);
    this.pmView.dispatch(tr);
    this.pmView.focus();
  }

  private deleteThisNode() {
    const pos = this.getPos();
    const sel = NodeSelection.create(this.pmView.state.doc, pos);
    const tr = this.pmView.state.tr.setSelection(sel);
    tr.deleteSelection();
    this.pmView.dispatch(tr);
    this.pmView.focus();
  }

  constructor(node: Node, view: PmEditorView, getPos: Function, ctx: CTX) {
    this.pmView = view;
    this.getPos = getPos;
    this.dom = document.createElement("span");
    this.ctx = ctx;

    // 创建 katexContainer，并使用 katex 渲染公式
    const src = node.attrs.src;
    this.src = src;
    this.katexContainer = document.createElement("span");
    this.katexContainer.classList.add(MathInlineKatex.KATEX_CONTAINER_CLASS);
    this.renderEquation();
    this.dom.append(this.katexContainer);
    // 点击公式时，打开公式编辑器
    this.katexContainer.addEventListener("click", () => {
      this.showMathEditor();
    });
  }

  // 不处理来自这个 node 的事件
  stopEvent() {
    return true;
  }

  ignoreMutation() {
    return false;
  }

  selectNode() {
    this.showMathEditor();
  }

  deselect() {}

  destroy() {
    this.katexContainer.innerHTML = "";
    this.katexContainer.remove();
  }
}
