import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Root-relative `/public/...` URLs need Vite `base` prefix (e.g. GitHub Pages subpath). */
export function resolvePublicAssetUrl(url: string | undefined | null): string | undefined {
  if (url == null || typeof url !== 'string') return undefined;
  const u = url.trim();
  if (!u) return undefined;
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (u.startsWith('/')) {
    const base = import.meta.env.BASE_URL ?? '/';
    if (base === '/') return u;
    return `${String(base).replace(/\/$/, '')}${u}`;
  }
  return u;
}

/** 下载图片到本地（支持根相对路径、http(s)、data URL）。 */
export async function downloadImageFromUrl(url: string, filenameBase: string): Promise<void> {
  const fetchUrl = resolvePublicAssetUrl(url) ?? url;
  const ext = url.startsWith('data:image/')
    ? (url.match(/^data:image\/(\w+)/)?.[1] ?? 'png')
    : (() => {
        try {
          const u = new URL(fetchUrl, typeof window !== 'undefined' ? window.location.href : 'http://local');
          const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/);
          return m?.[1]?.toLowerCase() ?? 'png';
        } catch {
          return 'png';
        }
      })();
  const safe = filenameBase.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'fumo';
  const filename = `${safe}.${ext}`;
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    const a = document.createElement('a');
    a.href = fetchUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
}
