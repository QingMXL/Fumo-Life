import { type Moment } from '@/types';

const key = (userId: string) => `fumo-discover-comment-baseline:${userId}`;

/** momentId → 已读到的「角色评论」条数（再增加则计为未读）。 */
export type DiscoverCommentReadBaseline = Record<string, number>;

export function loadDiscoverCommentReadBaseline(userId: string): DiscoverCommentReadBaseline {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return {};
    const o = JSON.parse(raw) as DiscoverCommentReadBaseline;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

export function saveDiscoverCommentReadBaseline(userId: string, baseline: DiscoverCommentReadBaseline) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(baseline));
  } catch {
    /* quota */
  }
}

/**
 * 按当前 feed 与基线计算未读角色评论总数；对首次出现的本人动态，把当前条数记入基线（历史评论不算未读）。
 * 会就地修改 baseline 并应由调用方 save。
 */
export function computeDiscoverUnreadCommentTotal(
  moments: Moment[],
  baseline: DiscoverCommentReadBaseline
): number {
  let total = 0;
  for (const m of moments) {
    if (m.authorType !== 'user') continue;
    const now = m.comments.filter(c => c.authorType === 'character').length;
    if (baseline[m.id] === undefined) {
      baseline[m.id] = now;
    }
    total += Math.max(0, now - baseline[m.id]);
  }
  return total;
}

export function clearDiscoverCommentReadBaseline(userId: string) {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
