import { pdfPageText } from './pdfLayout';
/** 从文件里抽纯文本。只为“能读出来”，不负责理解结构。 */

const MAX_BYTES = 15 * 1024 * 1024;

async function docxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser.js');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function pdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(pdfPageText(content.items.filter(item => 'str' in item)));
    }
    return pages.join('\n\n');
  } finally {
    await task.destroy();
  }
}

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`文件太大（${(file.size / 1024 / 1024).toFixed(1)} MB），请精简后再导入。`);

  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
      return await file.text();
    }
    if (name.endsWith('.docx')) {
      try {
        return await docxText(await file.arrayBuffer());
      } catch {
        throw new Error('这个 .docx 读不出来，可能已损坏或不是标准 Word 文档。');
      }
    }
    if (name.endsWith('.doc')) {
      throw new Error('不支持旧版 .doc，请在 Word 里另存为 .docx 或 PDF。');
    }
    if (name.endsWith('.pdf')) {
      return await pdfText(await file.arrayBuffer());
    }
    throw new Error('不支持这个格式，请用 PDF / DOCX / TXT / MD。');
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('不支持')) throw err;
    const hint = name.endsWith('.pdf') ? '如果 PDF 是扫描件或加密的，读不出文字，可以先转成 Word。' : '';
    throw new Error(`读取文件失败：${err instanceof Error ? err.message : '未知错误'}${hint ? ` ${hint}` : ''}`);
  }
}
