import { createPaperPage, paginatePaper, A4_WIDTH_PX } from './pagination';
import { A4_HEIGHT_PX } from './fit';

/** Export exactly the pages shown in preview; capture each page separately to avoid canvas limits. */
export async function buildResumePdf(paperEl: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const pagination = paginatePaper(paperEl);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  try {
    for (const [index, slice] of pagination.slices.entries()) {
      const page = createPaperPage(paperEl, slice, pagination);
      host.replaceChildren(page);
      const canvas = await toCanvas(page, {
        pixelRatio: 2.6, backgroundColor: '#ffffff',
        width: A4_WIDTH_PX, height: A4_HEIGHT_PX,
        style: { transform: 'none', margin: '0', boxShadow: 'none' },
      });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', .95), 'JPEG', 0, 0,
        pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
    }
    return pdf.output('blob');
  } finally { host.remove(); }
}

interface SavePickerHandle {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
}
type SavePicker = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<SavePickerHandle>;

export const canPickSavePath = (): boolean =>
  typeof (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker === 'function';

/**
 * 保存文件。优先让用户自己选目录（Chrome / Edge），
 * 不支持的浏览器退回到普通下载。
 */
export async function savePdfBlob(
  blob: Blob,
  filename: string,
  usePicker: boolean,
): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;

  if (usePicker && picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'PDF 文件', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      throw err;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

/** 文件名里不能出现的字符，统一换成短横线。 */
export function sanitizeFileName(input: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  return cleaned || '简历';
}
