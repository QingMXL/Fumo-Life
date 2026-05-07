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
