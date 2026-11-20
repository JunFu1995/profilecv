/** 只清理相邻中文分隔标点；保留小数、缩写、链接及问号/感叹号。 */
export function normalizeProse(text: string): string {
  return text.replace(/[。，、；](?:[ \t]*[。，、；])+/g, run => run.trim().slice(-1));
}

/** 为下一段衔接正文，避免原句句号与新分号叠加。 */
export function continueProse(text: string): string {
  const clean = normalizeProse(text).trim();
  if (!clean) return '';
  // 英文句末及缩写中的点不删除；完整问句、感叹句也保留原标点。
  if (/[.!?！？…]$/.test(clean)) return `${clean} `;
  return `${clean.replace(/[。，、；,;]+$/g, '').trimEnd()}；`;
}

export function joinProse(parts: string[]): string {
  const texts = parts.map(text => normalizeProse(text).trim()).filter(Boolean);
  return texts.map((text, i) => i < texts.length - 1 ? continueProse(text) : text).join('');
}
