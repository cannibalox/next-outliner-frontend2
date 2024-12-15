type Block = {
  id: string;
  content: string;
  children: Block[];
};

function parseHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const ctx: Block[] = [];
  const blocks: Record<string, Block> = {};

  function addBlock(content: string, ctx: Block[]) {
    if (content.trim().length === 0) return;
    const id = crypto.randomUUID();
    blocks[id] = { id, content, children: [] };
    ctx.push(blocks[id]);
  }

  function traverse(node: Node, ctx: Block[]) {
    if (node instanceof HTMLOListElement || node instanceof HTMLUListElement) {
      const newCtx = ctx.length === 0 ? ctx : ctx[ctx.length - 1].children;
      for (const child of (node as HTMLElement).childNodes) {
        traverse(child, newCtx); // 对每个子元素递归
      }
    } else if (node instanceof HTMLLIElement) {
      for (const child of (node as HTMLElement).childNodes) {
        traverse(child, ctx);
      }
    } else if (node instanceof Text) {
      addBlock(node.nodeValue ?? "", ctx);
    } else if (node instanceof HTMLElement) {
      addBlock(node.innerHTML, ctx);
    }
  }

  for (const child of doc.body.childNodes) {
    traverse(child, ctx);
  }
  return [ctx, blocks] as const;
}

export default parseHtml;
