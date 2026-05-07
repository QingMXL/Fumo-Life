/** 将本地选的图转成可写入数据库的 JPEG data URL（blob: 在刷新后会失效）。 */
export async function fileOrBlobUrlToJpegDataUrl(
  source: File | string,
  maxSide = 1600,
  quality = 0.82
): Promise<string> {
  let blob: Blob;
  if (typeof source === 'string') {
    if (source.startsWith('data:')) return source;
    const res = await fetch(source);
    blob = await res.blob();
  } else {
    blob = source;
  }
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height, 1));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}
