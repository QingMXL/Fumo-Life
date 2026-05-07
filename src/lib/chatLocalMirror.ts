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

/** 云端为主；本地仅补齐尚未同步成功的 tmp-* 或离线期间消息。 */
export function mergeChatMirrorWithCloud(cloud: Message[], local: Message[]): Message[] {
  if (cloud.length === 0) {
    return local.length > 0 ? local : [];
  }
  const out = [...cloud];
  for (const m of local) {
    if (!m.id.startsWith('tmp-')) continue;
    const dup = cloud.some(
      c =>
        c.sender === m.sender &&
        (c.text ?? '') === (m.text ?? '') &&
        (c.imageUrl ?? '') === (m.imageUrl ?? '') &&
        Math.abs(c.timestamp.getTime() - m.timestamp.getTime()) < 12_000
    );
    if (!dup) out.push(m);
  }
  return out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
