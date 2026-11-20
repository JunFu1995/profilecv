/** A scroll container still owns its children when its content currently fits. */
export function findScrollContainer(element: HTMLElement): HTMLElement | null {
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (/^(auto|scroll|overlay)$/.test(getComputedStyle(ancestor).overflowY)) return ancestor;
  }
  return document.scrollingElement as HTMLElement | null;
}
