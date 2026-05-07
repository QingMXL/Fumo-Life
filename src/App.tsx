import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { type Language, type UserProfile, type Character, type Message, CHARACTERS as INITIAL_CHARACTERS } from './types';
import { BottomNav } from './components/BottomNav';
import { MessagesPage } from './pages/MessagesPage';
import { LoginPage } from './pages/LoginPage';

const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then(m => ({ default: m.DiscoverPage })));
const MePage = lazy(() => import('./pages/MePage').then(m => ({ default: m.MePage })));
import { type AppUser, logout, restoreAuthUser } from './services/auth';
import { clearChatMirrorsForUser } from '@/lib/chatLocalMirror';
import {
  computeDiscoverUnreadCommentTotal,
  loadDiscoverCommentReadBaseline,
  saveDiscoverCommentReadBaseline,
} from '@/lib/discoverCommentReadBaseline';
import { clearLocalSessionArtifacts } from '@/lib/sessionCleanup';
import {
  clearUserMessages,
  createCharacterMoment,
  fetchMomentsFeed,
  insertMessage,
  loadBonds,
  loadUnreadStates,
  mapPreviewByLanguage,
  purgeUserCloudContent,
  saveUnreadState,
  subscribeMomentsRefresh,
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

  const handleSwitchUser = useCallback(async () => {
    const uid = authUser?.id ?? null;
    if (uid) {
      try {
        await purgeUserCloudContent(uid);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[auth] purgeUserCloudContent:', e);
      }
    }
    clearLocalSessionArtifacts(uid);
    logout();
    setAuthUser(null);
    setCharacters(INITIAL_CHARACTERS);
    setUserProfile({ displayName: '神社客', avatarUrl: '/avatars/user.png' });
    setDiscoverUnreadCount(0);
  }, [authUser]);

  const handleClearChats = useCallback(async () => {
    if (!authUser) return;
    await clearUserMessages(authUser.id);
    clearChatMirrorsForUser(authUser.id);
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
      const seed = INITIAL_CHARACTERS.find(it => it.id === id);
      if (authUser && c) {
        const zh = c.lastMessage?.zh || seed?.lastMessage?.zh || '';
        const ja = c.lastMessage?.ja || seed?.lastMessage?.ja || '';
        const en = c.lastMessage?.en || seed?.lastMessage?.en || '';
        const at = c.lastMessageAt ?? seed?.lastMessageAt ?? Date.now();
        void saveUnreadState(authUser.id, id, {
          unreadCount: 0,
          lastMessageZh: zh,
          lastMessageJa: ja,
          lastMessageEn: en,
          lastMessageAt: at,
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
              zh: language === 'zh' ? lastText : (c.lastMessage?.zh ?? ''),
              ja: language === 'ja' ? lastText : (c.lastMessage?.ja ?? ''),
              en: language === 'en' ? lastText : (c.lastMessage?.en ?? ''),
            },
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

  /** 任意 Tab 下更新「发现」角标：拉取本人动态上的角色新评论数（与 Discover 内已读基线一致）。 */
  useEffect(() => {
    if (!authUser) return;
    let alive = true;
    const refreshDiscoverUnread = async () => {
      try {
        const { moments } = await fetchMomentsFeed(authUser.id);
        if (!alive) return;
        const baseline = { ...loadDiscoverCommentReadBaseline(authUser.id) };
        const total = computeDiscoverUnreadCommentTotal(moments, baseline);
        saveDiscoverCommentReadBaseline(authUser.id, baseline);
        setDiscoverUnreadCount(total);
      } catch {
        /* 离线或 Supabase 不可用时保留上次角标 */
      }
    };
    void refreshDiscoverUnread();
    const unsub = subscribeMomentsRefresh(() => {
      void refreshDiscoverUnread();
    });
    const interval = window.setInterval(() => void refreshDiscoverUnread(), 35_000);
    return () => {
      alive = false;
      unsub();
      window.clearInterval(interval);
    };
  }, [authUser]);

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
        try {
          const { generateCharacterProactiveText, generateFumoSceneImage, shouldAttachAiImage } = await import(
            './services/gemini'
          );
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
            await createCharacterMoment(pick.id, {
              content: { zh: text, ja: text, en: text },
              imageUrl,
            });
          }
          updateConversationMeta(pick.id, imageUrl ? `${text} [Photo]` : text, now, { incrementUnread: true });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[proactive] skipped:', e);
        }
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

  const routeFallback = (
    <div className="flex min-h-[55vh] max-w-md mx-auto items-center justify-center pb-24 text-sm font-extrabold text-cream-text/40">
      …
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-cream-bg text-cream-text selection:bg-cream-accent/30">
        <Suspense fallback={routeFallback}>
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
        </Suspense>
        
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
