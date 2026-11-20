import { A4_HEIGHT_PX } from './fit';

export const A4_WIDTH_PX = 793.7;
export interface Interval { top: number; bottom: number }
export interface PageSlice { from: number; to: number }
export interface PaperPagination { slices: PageSlice[]; paddingTop: number; paddingBottom: number }

/** Keep ordinary entries together; oversized entries may split only between text lines. */
export function planPageSlices(top: number, bottom: number, capacity: number, lines: Interval[], groups: Interval[]): PageSlice[] {
  if (capacity <= 0) throw new Error('纸张的可用高度必须大于零');
  const slices: PageSlice[] = [];
  let from = top;
  while (from < bottom - .1) {
    let to = Math.min(bottom, from + capacity);
    if (to < bottom) {
      // Moving a boundary may encounter another nested group or overlapping inline run.
      // Repeat both checks until no entry, heading group, or glyph is bisected.
      let previous: number;
      do {
        previous = to;
        const crossing = groups.filter(g => g.bottom - g.top <= capacity && g.top > from + .1 && g.top < to && g.bottom > to);
        if (crossing.length) to = Math.min(...crossing.map(g => g.top));
        for (const line of lines) if (line.top < to - .1 && line.bottom > to + .1) to = Math.min(to, line.top);
      } while (to < previous);
      if (to <= from + .1) throw new Error('内容中有超过一页高度的元素，请缩小该元素后再导出');
    }
    slices.push({from, to});
    from = to;
  }
  return slices.length ? slices : [{from: top, to: top}];
}

/** All coordinates are relative to the unscaled paper, never offsetParent or screen zoom. */
export function paginatePaper(paper: HTMLElement): PaperPagination {
  const box = paper.getBoundingClientRect();
  const ratio = box.width / (parseFloat(getComputedStyle(paper).width) || A4_WIDTH_PX) || 1;
  const interval = (rect: DOMRect): Interval => ({top:(rect.top-box.top)/ratio, bottom:(rect.bottom-box.top)/ratio});
  const style = getComputedStyle(paper);
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const lines: Interval[] = [];
  const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) if (rect.width && rect.height) lines.push(interval(rect));
  }
  for (const img of paper.querySelectorAll('img')) lines.push(interval(img.getBoundingClientRect()));
  const groups = Array.from(paper.querySelectorAll<HTMLElement>('.paper-profile, .entry, .pub, .skill-row')).map(el=>interval(el.getBoundingClientRect()));
  // Keep a heading with the first line that follows it, even in side-heading templates.
  for (const heading of paper.querySelectorAll<HTMLElement>('.block-title, .entry-head')) {
    const bounds = interval(heading.getBoundingClientRect());
    const following = lines.filter(l=>l.top >= bounds.bottom - .5).sort((a,b)=>a.top-b.top)[0];
    if (following) groups.push({top:bounds.top,bottom:following.bottom});
  }
  const bottom = Math.max(paddingTop, ...lines.map(l=>l.bottom), ...Array.from(paper.children).map(el=>interval(el.getBoundingClientRect()).bottom));
  return {paddingTop,paddingBottom,slices:planPageSlices(paddingTop,bottom,A4_HEIGHT_PX-paddingTop-paddingBottom,lines,groups)};
}

/** Identical page DOM is used for screen preview, browser printing, and raster export. */
export function createPaperPage(paper: HTMLElement, slice: PageSlice, pagination: PaperPagination): HTMLElement {
  const page = document.createElement('div');
  page.className = 'preview-page';
  const clip = document.createElement('div');
  clip.className = 'preview-page-content';
  clip.style.top = `${pagination.paddingTop}px`;
  clip.style.height = `${Math.max(0, slice.to-slice.from)}px`;
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.style.transform = `translateY(${-slice.from}px)`;
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  const origin = paper.getBoundingClientRect();
  const ratio = origin.width / (parseFloat(getComputedStyle(paper).width) || A4_WIDTH_PX) || 1;
  const originals = [paper, ...paper.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  originals.forEach((el,i) => {
    const copy = copies[i];
    copy.removeAttribute('id');
    copy.classList.remove('locate-flash','preview-bullet-active','selection-locate');
    const rect = el.getBoundingClientRect();
    const top = (rect.top-origin.top)/ratio, bottom = (rect.bottom-origin.top)/ratio;
    if (bottom <= slice.from + .1 || top >= slice.to - .1) {
      copy.setAttribute('aria-hidden','true');
      copy.style.visibility = 'hidden';
      copy.removeAttribute('data-locate');
      copy.removeAttribute('data-bullet-id');
      copy.removeAttribute('data-summary-group');
      copy.removeAttribute('tabindex');
    }
  });
  clip.append(clone);
  page.append(clip);
  return page;
}
