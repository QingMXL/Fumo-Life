import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { type Language, type UserProfile, type Character, type Message, CHARACTERS as INITIAL_CHARACTERS } from './types';
import { BottomNav } from './components/BottomNav';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { ContactsPage } from './pages/ContactsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MePage } from './pages/MePage';
import { LoginPage } from './pages/LoginPage';
import { generateCharacterProactiveText, generateFumoSceneImage, shouldAttachAiImage } from './services/gemini';
import { type AppUser, logout, restoreAuthUser } from './services/auth';
import {
  clearUserMessages,
  createCharacterMoment,
  insertMessage,
  loadBonds,
  loadUnreadStates,
  mapPreviewByLanguage,
  saveUnreadState,
  upsertBond,
  updateCloudUserProfile,
  withCharacterCloudState,
} from './services/cloudStore';

const USER_PROFILE_KEY = 'fumo-life-user-profile';
const DISCOVER_UNREAD_KEY = 'fumo-discover-unread-count';
const LANGUAGE_KEY = 'fumo-language';
const CHAT_CLEARED_KEY_PREFIX = 'fumo-chat-cleared-at:';

function formatHHMM(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return migrateUserProfile(JSON.parse(raw) as UserProfile);
  } catch {
    /* ignore */
  }
  return {
    displayName: '神社客',
    avatarUrl: '/avatars/user.png',
  };
}

function migrateUserProfile(p: UserProfile): UserProfile {
  if (p.displayName === '饲养员 #89757') {
    return { ...p, displayName: '神社客' };
  }
  return p;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const raw = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    return raw === 'zh' || raw === 'ja' || raw === 'en' ? raw : 'zh';
  });
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [discoverUnreadCount, setDiscoverUnreadCount] = useState(() => {
    const raw = localStorage.getItem(DISCOVER_UNREAD_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (!authUser) return;
    void updateCloudUserProfile(authUser.id, {
      username: userProfile.displayName || '神社客',
      avatarUrl: userProfile.avatarUrl || '/avatars/user.png',
    });
  }, [authUser, userProfile.avatarUrl, userProfile.displayName]);

  const handleSwitchUser = useCallback(() => {
    // 清空当前登录态与本地展示态，返回登录页。
    logout();
    setAuthUser(null);
    setCharacters(INITIAL_CHARACTERS);
    setUserProfile({ displayName: '神社客', avatarUrl: '/avatars/user.png' });
    setDiscoverUnreadCount(0);
  }, []);

  const handleClearChats = useCallback(async () => {
    if (!authUser) return;
    await clearUserMessages(authUser.id);
    // 标记本次用户已主动清空，聊天页无历史时不再展示兜底开场白。
    localStorage.setItem(`${CHAT_CLEARED_KEY_PREFIX}${authUser.id}`, String(Date.now()));
  }, [authUser]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await restoreAuthUser();
        if (!alive) return;
        setAuthUser(user);
        if (user) {
          setUserProfile({
            displayName: user.username || '神社客',
            avatarUrl: user.avatarUrl || '/avatars/user.png',
          });
          const [unreadMap, bondMap] = await Promise.all([
            loadUnreadStates(user.id),
            loadBonds(user.id),
          ]);
          if (!alive) return;
          setCharacters(prev => withCharacterCloudState(prev, unreadMap, bondMap));
        }
      } finally {
        if (alive) setAuthLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateBond = useCallback((id: string, amount: number) => {
    setCharacters(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              bondLevel: Math.min(10, c.bondLevel + amount),
              lastBondAt: Date.now(),
            }
          : c
      )
    );
    if (authUser) {
      const target = characters.find(c => c.id === id);
      if (target) {
        const nextBond = Math.min(10, target.bondLevel + amount);
        void upsertBond(authUser.id, id, nextBond, Date.now());
      }
    }
  }, [authUser, characters]);

  // 使用函数式 setState，避免依赖 characters —— 否则 Chat 挂载时 markRead 触发引用变化，
  // 会导致 ChatPage 的加载 effect 反复卸载并把 alive=false，云端历史永远不写入界面。
  const markChatRead = useCallback((id: string) => {
    setCharacters(prev => {
      const c = prev.find(it => it.id === id);
      if (authUser && c) {
        void saveUnreadState(authUser.id, id, {
          unreadCount: 0,
          lastMessageZh: c.lastMessage?.zh ?? '',
          lastMessageJa: c.lastMessage?.ja ?? '',
          lastMessageEn: c.lastMessage?.en ?? '',
          lastMessageAt: c.lastMessageAt,
        });
      }
      return prev.map(ch => (ch.id === id ? { ...ch, unreadCount: 0 } : ch));
    });
  }, [authUser]);

  const refreshOnlineStatus = useCallback(() => {
    setCharacters(prev =>
      prev.map(c => {
        // refresh once on entering contacts: flip only some to avoid full churn
        if (Math.random() < 0.35) {
          const biasOnline = 0.62;
          return { ...c, isOnline: Math.random() < biasOnline };
        }
        return c;
      })
    );
  }, []);

  const updateConversationMeta = useCallback(
    (characterId: string, lastText: string, at: number, opts?: { incrementUnread?: boolean }) => {
      setCharacters(prev => {
        const current = prev.find(c => c.id === characterId);
        if (!current) return prev;

        const nextUnread = opts?.incrementUnread
          ? (current.unreadCount ?? 0) + 1
          : (current.unreadCount ?? 0);

        if (authUser) {
          const lane = mapPreviewByLanguage(language, lastText);
          void saveUnreadState(authUser.id, characterId, {
            unreadCount: nextUnread,
            lastMessageZh: lane.zh || current.lastMessage?.zh || '',
            lastMessageJa: lane.ja || current.lastMessage?.ja || '',
            lastMessageEn: lane.en || current.lastMessage?.en || '',
            lastMessageAt: at,
          });
        }

        return prev.map(c => {
          if (c.id !== characterId) return c;
          return {
            ...c,
            lastMessage: {
              zh: c.lastMessage?.zh ?? lastText,
              ja: c.lastMessage?.ja ?? lastText,
              en: c.lastMessage?.en ?? lastText,
              [language]: lastText,
            } as any,
            lastMessageAt: at,
            lastTime: formatHHMM(at),
            unreadCount: opts?.incrementUnread ? (c.unreadCount ?? 0) + 1 : c.unreadCount,
          };
        });
      });
    },
    [authUser, language]
  );

  const unreadMessagesTotal = useMemo(
    () => characters.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [characters]
  );

  useEffect(() => {
    localStorage.setItem(DISCOVER_UNREAD_KEY, String(discoverUnreadCount));
  }, [discoverUnreadCount]);

  useEffect(() => {
    // Bond decay: small random drift down, only if not interacted recently.
    const interval = window.setInterval(() => {
      const now = Date.now();
      setCharacters(prev =>
        prev.map(c => {
          const last = c.lastBondAt ?? now;
          if (c.bondLevel <= 0) return c;
          if (now - last < 5 * 60_000) return c;
          if (Math.random() < 0.16) {
            const nextBond = Math.max(0, c.bondLevel - 1);
            if (authUser) void upsertBond(authUser.id, c.id, nextBond, now);
            return { ...c, bondLevel: nextBond };
          }
          return c;
        })
      );
    }, 70_000);
    return () => window.clearInterval(interval);
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    // 角色主动消息：AI 文本 + 随机配图（20%-40%），带图时同步到 Moments。
    const interval = window.setInterval(() => {
      const now = Date.now();
      const eligible = characters.filter(c => c.isOnline);
      if (eligible.length === 0) return;
      const pick = eligible[Math.floor(Math.random() * eligible.length)]!;
      const inChat = window.location.pathname === `/chat/${pick.id}`;
      if (inChat) return;
      void (async () => {
        const text = await generateCharacterProactiveText(pick.id, language, 'chat');
        let imageUrl: string | undefined;
        if (shouldAttachAiImage()) {
          const img = await generateFumoSceneImage(pick.id, language, text);
          if (img) imageUrl = img;
        }
        await insertMessage(authUser.id, {
          characterId: pick.id,
          sender: 'fumo',
          text,
          imageUrl,
        });
        if (imageUrl) {
          // 仅有配图时写入角色动态，避免纯文本刷屏朋友圈。
          await createCharacterMoment(pick.id, {
            content: { zh: text, ja: text, en: text },
            imageUrl,
          });
        }
        updateConversationMeta(pick.id, imageUrl ? `${text} [Photo]` : text, now, { incrementUnread: true });
      })();
    }, 28_000 + Math.floor(Math.random() * 15_000));
    return () => window.clearInterval(interval);
  }, [authUser, characters, language, updateConversationMeta]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-bg font-sans text-cream-text">
        <div className="fumo-header-sky absolute inset-x-0 top-0 h-40" aria-hidden />
        <p className="relative z-10 text-sm font-extrabold tracking-wide text-cream-text/70">Loading…</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <LoginPage
        language={language}
        onLanguageChange={setLanguage}
        onLoginSuccess={async () => {
          const user = await restoreAuthUser();
          setAuthUser(user);
          if (user) {
            setUserProfile({ displayName: user.username, avatarUrl: user.avatarUrl || '/avatars/user.png' });
            const [unreadMap, bondMap] = await Promise.all([loadUnreadStates(user.id), loadBonds(user.id)]);
            setCharacters(prev => withCharacterCloudState(prev, unreadMap, bondMap));
          }
        }}
      />
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-cream-bg text-cream-text selection:bg-cream-accent/30">
        <Routes>
          <Route path="/" element={<MessagesPage language={language} characters={characters} />} />
          <Route
            path="/chat/:id"
            element={
              <ChatPage
                language={language}
                characters={characters}
                userId={authUser.id}
                onUpdateBond={updateBond}
                onMarkChatRead={markChatRead}
                onConversationMeta={updateConversationMeta}
              />
            }
          />
          <Route
            path="/contacts"
            element={
              <ContactsPage
                language={language}
                characters={characters}
                onEnterRefreshOnline={refreshOnlineStatus}
              />
            }
          />
          <Route
            path="/discover"
            element={
              <DiscoverPage
                language={language}
                userId={authUser.id}
                userProfile={userProfile}
                characters={characters}
                onUnreadCountChange={setDiscoverUnreadCount}
              />
            }
          />
          <Route
            path="/me"
            element={
              <MePage
                language={language}
                setLanguage={setLanguage}
                characters={characters}
                userId={authUser.id}
                userProfile={userProfile}
                onUserProfileChange={setUserProfile}
                onSwitchUser={handleSwitchUser}
                onClearChats={handleClearChats}
              />
            }
          />
        </Routes>
        
        {/* Only show BottomNav on main pages, not chat */}
        <Routes>
          <Route
            path="/"
            element={
              <BottomNav
                language={language}
                unreadMessagesCount={unreadMessagesTotal}
                unreadDiscoverCount={discoverUnreadCount}
              />
            }
          />
          <Route
            path="/contacts"
            element={
              <BottomNav
                language={language}
                unreadMessagesCount={unreadMessagesTotal}
                unreadDiscoverCount={discoverUnreadCount}
              />
            }
          />
          <Route
            path="/discover"
            element={
              <BottomNav
                language={language}
                unreadMessagesCount={unreadMessagesTotal}
                unreadDiscoverCount={discoverUnreadCount}
              />
            }
          />
          <Route
            path="/me"
            element={
              <BottomNav
                language={language}
                unreadMessagesCount={unreadMessagesTotal}
                unreadDiscoverCount={discoverUnreadCount}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
