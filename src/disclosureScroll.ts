import { findScrollContainer } from './scrollContainer';

/** Resolve against the post-layout position, including any native scroll anchoring. */
export function disclosureScrollTop({ scrollTop, headingTop, targetTop, maxScroll }: {
  scrollTop: number; headingTop: number; targetTop: number; maxScroll: number;
}): number {
  return Math.max(0, Math.min(maxScroll, scrollTop + headingTop - targetTop));
}

/** Capture a user-triggered toggle only; preview navigation manages its own scrolling. */
export function prepareDisclosureScroll(button: HTMLElement, switching: boolean): () => void {
  const heading = button.closest<HTMLElement>('.card-head, .pcard-head') ?? button;
  const originalTop = heading.getBoundingClientRect().top;
  const scroller = findScrollContainer(heading);
  if (!scroller) return () => {};

  return () => {
    if (!heading.isConnected || !scroller.isConnected) return;
    const root = scroller === document.scrollingElement;
    const bounds = scroller.getBoundingClientRect();
    let top = root ? 0 : bounds.top + scroller.clientTop;
    const bottom = root ? window.innerHeight : top + scroller.clientHeight;
    // The chapter navigation is sticky inside the editor's scrolling panel.
    const nav = scroller.querySelector<HTMLElement>('.editor-section-nav');
    if (nav && nav.getClientRects().length) {
      const navBounds = nav.getBoundingClientRect();
      if (navBounds.top <= top + 1 && navBounds.bottom > top) top = navBounds.bottom;
    }
    const rect = heading.getBoundingClientRect();
    const targetTop = switching ? top + 12 : Math.max(top + 8, Math.min(originalTop, bottom - rect.height - 8));
    const next = disclosureScrollTop({scrollTop:scroller.scrollTop, headingTop:rect.top, targetTop, maxScroll:Math.max(0,scroller.scrollHeight - scroller.clientHeight)});
    // Commit before paint, without a second animated jump or scrolling the preview pane.
    scroller.scrollTo({top:next, behavior:'instant'});
  };
}
