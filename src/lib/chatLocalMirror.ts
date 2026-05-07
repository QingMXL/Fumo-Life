import { type Message } from '@/types';

const PREFIX = 'fumo-chat-mirror:';

export function chatMirrorKey(userId: string, characterId: string) {
  return `${PREFIX}${userId}:${characterId}`;
}

function safeParse(raw: string | null): Message[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    if (!Array.isArray(arr)) return [];
    return arr.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

export function loadChatMirror(userId: string, characterId: string): Message[] {
  try {
    return safeParse(localStorage.getItem(chatMirrorKey(userId, characterId)));
  } catch {
    return [];
  }
}

export function saveChatMirror(userId: string, characterId: string, messages: Message[]) {
  try {
    const serializable = messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    localStorage.setItem(chatMirrorKey(userId, characterId), JSON.stringify(serializable));
  } catch {
    /* quota / private mode */
  }
}

function isFuzzyDup(a: Message, b: Message, windowMs: number) {
  return (
    a.sender === b.sender &&
    (a.text ?? '') === (b.text ?? '') &&
    (a.imageUrl ?? '') === (b.imageUrl ?? '') &&
    Math.abs(a.timestamp.getTime() - b.timestamp.getTime()) < windowMs
  );
}

/**
 * 合并云端与本地镜像：按 id 并集，同一 id 以云端为准；本地独有的行若与云端某条在内容与时间上高度重合则丢弃（防 tmp/UUID 双份）。
 * 解决：仅合并 tmp-* 时，若角色消息已带 UUID 只存在镜像里、云端尚未返回，会被误丢。
 */
export function mergeChatMirrorWithCloud(cloud: Message[], local: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of cloud) {
    byId.set(m.id, m);
  }
  for (const m of local) {
    if (byId.has(m.id)) continue;
    // 仅对未落库的 tmp 做模糊去重；已带真实 id 的本地行一律保留，避免多条合法回复被当成重复丢掉。
    if (m.id.startsWith('tmp-')) {
      const dup = [...byId.values()].some(c => isFuzzyDup(c, m, 25_000));
      if (dup) continue;
    }
    byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function clearChatMirrorsForUser(userId: string) {
  const p = `${PREFIX}${userId}:`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(p)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
