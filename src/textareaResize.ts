import { findScrollContainer } from './scrollContainer';

export function resizeTextarea(el: HTMLTextAreaElement, minRows: number): void {
  if (!el.getClientRects().length || !el.clientWidth) return;
  const scroller = findScrollContainer(el);
  const scrollTop = scroller?.scrollTop;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, minRows * 22) + el.offsetHeight - el.clientHeight}px`;
  // Measuring the shorter auto height can clamp a panel near its bottom before
  // its final height is restored. Do not leave that intermediate scroll in place.
  if (scroller && scrollTop !== undefined && scroller.scrollTop !== scrollTop) {
    scroller.scrollTo({ top: scrollTop, behavior: 'instant' });
  }
}
