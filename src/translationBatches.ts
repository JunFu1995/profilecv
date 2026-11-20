/** 按内容长度分批；单条原文不拆开，保持翻译缓存的对应关系。 */
export function translationBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let batch: string[] = [];
  let length = 0;
  for (const text of texts) {
    if (batch.length && (length + text.length > 1800 || batch.length >= 20)) {
      batches.push(batch);
      batch = [];
      length = 0;
    }
    batch.push(text);
    length += text.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
