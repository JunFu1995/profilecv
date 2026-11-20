/** A4 在 96dpi 下的像素高度，和预览里用的常量保持一致。 */
export const A4_HEIGHT_PX = 1122.5;
/** 压缩下限：再小就打不出来也看不清。 */
export const MIN_FIT = 0.76;
/** 放大的上限：再大就不像简历了。 */
export const MAX_FIT = 1.14;

/**
 * 目标高度要留一点余量：屏幕测量的 1px 误差、打印时的字体栅格化差异，
 * 都会让"刚好 1122px"在 PDF 里变成 2 页。
 */
const SAFETY = 16;
const TARGET_HEIGHT = A4_HEIGHT_PX - SAFETY;

/** 每个间隙最多额外撑开多少像素，超过就难看。 */
const STRETCH_MAX = 24;

export interface FitResult {
  scale: number;
  stretch: number;
  reason: 'compressed' | 'expanded' | 'fits';
  /** 排版后内容占一页的比例（0~1），用来判断是否还"不够饱满" */
  fill: number;
  /** 实际测量是否放得下一页；不能仅凭字号是否到达下限判断。 */
  fitsOnPage: boolean;
}

/** Successful one-page fitting is silent; only return feedback when it cannot safely fit. */
export function fitFeedback(result: FitResult, pageCount: number): { text: string } | null {
  if (result.fitsOnPage && pageCount <= 1) return null;
  const outcome = pageCount > 1 ? `当前仍为 ${pageCount} 页。` : '内容已接近单页边界，导出时可能分页。';
  return { text: `已保留全部内容，${outcome}建议精简要点或减少项目后重试，也可以保留多页导出。` };
}

function measureAt(el: HTMLElement, scale: number): number {
  el.style.setProperty('--fit', String(scale));
  const prevMin = el.style.minHeight;
  el.style.minHeight = '0';
  const height = el.offsetHeight; // 忽略 transform，拿到真实排版高度
  el.style.minHeight = prevMin;
  return height;
}

/** 能加间距的位置：章节块 + 条目。用来把空白均摊掉。 */
function gapCount(el: HTMLElement): number {
  return el.querySelectorAll('.block, .entry').length;
}

/**
 * 双向自适应：
 * - 内容溢出 → 二分压字号，找到能放进一页的最大值
 * - 内容不足 → 先放大字号，再把剩余空白均摊到章节/条目的间距上
 * 只改 --fit 和 --stretch，不动内容、不动页边距。
 */
export function fitPaper(el: HTMLElement): FitResult {
  el.style.setProperty('--stretch', '0px');
  const natural = measureAt(el, 1);

  // ① 太长：压缩
  if (natural > TARGET_HEIGHT) {
    if (measureAt(el, MIN_FIT) > TARGET_HEIGHT) {
      el.style.setProperty('--fit', String(MIN_FIT));
      return { scale: MIN_FIT, stretch: 0, reason: 'compressed', fill: 1, fitsOnPage: false };
    }
    let lo = MIN_FIT;
    let hi = 1;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      if (measureAt(el, mid) <= TARGET_HEIGHT) lo = mid;
      else hi = mid;
    }
    const scale = Math.floor(lo * 1000) / 1000;
    el.style.setProperty('--fit', String(scale));
    return { scale, stretch: 0, reason: 'compressed', fill: 1, fitsOnPage: true };
  }

  // ② 差不多正好：不动
  if (natural >= TARGET_HEIGHT * 0.965) {
    el.style.setProperty('--fit', '1');
    return { scale: 1, stretch: 0, reason: 'fits', fill: natural / TARGET_HEIGHT, fitsOnPage: true };
  }

  // ③ 太短：放大字号
  let scale = 1;
  if (measureAt(el, MAX_FIT) <= TARGET_HEIGHT) {
    scale = MAX_FIT;
  } else {
    let lo = 1;
    let hi = MAX_FIT;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      if (measureAt(el, mid) <= TARGET_HEIGHT) lo = mid;
      else hi = mid;
    }
    scale = Math.floor(lo * 1000) / 1000;
  }
  el.style.setProperty('--fit', String(scale));

  // ④ 放大后仍有明显空白：把剩余高度均摊到间距
  let stretch = 0;
  const afterScale = measureAt(el, scale);
  const slack = TARGET_HEIGHT - afterScale;
  const gaps = gapCount(el);
  if (slack > 24 && gaps > 0) {
    stretch = Math.min(STRETCH_MAX, slack / gaps);
    el.style.setProperty('--stretch', `${stretch.toFixed(1)}px`);
    // 撑过头就一点点收回来（字体栅格化的取整误差）
    let guard = 0;
    while (measureAt(el, scale) > TARGET_HEIGHT && stretch > 0.5 && guard < 12) {
      stretch *= 0.85;
      el.style.setProperty('--stretch', `${stretch.toFixed(1)}px`);
      guard++;
    }
  }

  const finalHeight = measureAt(el, scale);
  return {
    scale,
    stretch: Math.round(stretch * 10) / 10,
    reason: 'expanded',
    fill: Math.min(1, finalHeight / TARGET_HEIGHT),
    fitsOnPage: finalHeight <= TARGET_HEIGHT,
  };
}
