export const inViewport = (el: HTMLElement, topMargin = 60, bottomMargin = 0) => {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight - bottomMargin && rect.bottom > topMargin;
}

export const getHoveredElementWithClass = (el: any, className: string): Element | null => {
  let curr: any = el;
  let hoverBlockItem;
  while (curr instanceof Node) {
    if (curr instanceof Element && curr.classList.contains(className)) {
      hoverBlockItem = curr;
      break;
    }
    curr = curr.parentNode;
  }
  return hoverBlockItem instanceof Element ? hoverBlockItem : null;
};