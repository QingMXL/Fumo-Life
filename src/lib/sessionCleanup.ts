import { clearChatMirrorsForUser } from '@/lib/chatLocalMirror';
import { clearAllAiRecentCaches } from '@/services/gemini';

const USER_PROFILE_KEY = 'fumo-life-user-profile';
const DISCOVER_UNREAD_KEY = 'fumo-discover-unread-count';
const CHAT_CLEARED_KEY_PREFIX = 'fumo-chat-cleared-at:';

function removeLocalStorageKeyPrefix(prefix: string) {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** 切换用户 / 登出前：清本地会话痕迹（保留界面语言等全局偏好）。 */
export function clearLocalSessionArtifacts(userId: string | null) {
  clearAllAiRecentCaches();
  removeLocalStorageKeyPrefix('fumo-ping-last:');
  removeLocalStorageKeyPrefix('fumo-moment-reply-last:');
  if (userId) {
    clearChatMirrorsForUser(userId);
    try {
      localStorage.removeItem(`${CHAT_CLEARED_KEY_PREFIX}${userId}`);
    } catch {
      /* ignore */
    }
  } else {
    removeLocalStorageKeyPrefix('fumo-chat-mirror:');
  }
  try {
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(DISCOVER_UNREAD_KEY);
  } catch {
    /* ignore */
  }
}
