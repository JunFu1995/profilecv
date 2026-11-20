/** 把用户选的照片压到合适尺寸再存：localStorage 只有 5MB，原图会直接把配额撑爆。 */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件（JPG / PNG）。');
  if (file.size > 12 * 1024 * 1024) throw new Error('图片太大（超过 12MB），请先压缩。');

  const bitmap = await createImageBitmap(file);
  const MAX_W = 420;
  const MAX_H = 560;
  const ratio = Math.min(MAX_W / bitmap.width, MAX_H / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法处理这张图片。');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL('image/jpeg', 0.85);
}
