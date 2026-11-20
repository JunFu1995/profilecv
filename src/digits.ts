/** 从一段文字里抽数字（含常见量词），用于检查改写有没有丢数字或凭空造数字。 */
const NUM_RE = /\d+(?:\.\d+)?\s*(?:%|‰|万|亿|千|k|K|M|ms|s|倍|人|次|天|年|个月|个|条|起|项|台|套|层)?\+?/g;

export function extractNumbers(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const value = m[0].replace(/\s+/g, '').toLowerCase();
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

export interface NumberCheck {
  missing: string[];
  extra: string[];
}

/** 只做提示，不做拦截：同义换算（3 万 → 30000）也会被算作 missing，属于可接受的误报。 */
export function checkNumbers(original: string, next: string): NumberCheck {
  const before = extractNumbers(original);
  const after = extractNumbers(next);
  return {
    missing: before.filter((n) => !after.includes(n)),
    extra: after.filter((n) => !before.includes(n)),
  };
}

export function hasNumberProblem(check: NumberCheck | null): boolean {
  return Boolean(check && (check.missing.length > 0 || check.extra.length > 0));
}
