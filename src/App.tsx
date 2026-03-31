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
import { pickIncomingPing } from './data/inboxNpcPings';
import { type AppUser, restoreAuthUser } from './services/auth';
import {
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

  const markChatRead = useCallback((id: string) => {
    setCharacters(prev =>
      prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    if (authUser) {
      const c = characters.find(it => it.id === id);
      void saveUnreadState(authUser.id, id, {
        unreadCount: 0,
        lastMessageZh: c?.lastMessage?.zh ?? '',
        lastMessageJa: c?.lastMessage?.ja ?? '',
        lastMessageEn: c?.lastMessage?.en ?? '',
        lastMessageAt: c?.lastMessageAt,
      });
    }
  }, [authUser, characters]);

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
      setCharacters(prev =>
        prev.map(c => {
          if (c.id !== characterId) return c;
          return {
            ...c,
            lastMessage: {
              zh: c.lastMessage?.zh ?? lastText,
              ja: c.lastMessage?.ja ?? lastText,
              en: c.lastMessage?.en ?? lastText,
              // store only the preview for current language by overwriting that lane
              [language]: lastText,
            } as any,
            lastMessageAt: at,
            lastTime: formatHHMM(at),
            unreadCount: opts?.incrementUnread ? (c.unreadCount ?? 0) + 1 : c.unreadCount,
          };
        })
      );
      if (authUser) {
        const current = characters.find(c => c.id === characterId);
        const nextUnread = opts?.incrementUnread ? (current?.unreadCount ?? 0) + 1 : (current?.unreadCount ?? 0);
        const lane = mapPreviewByLanguage(language, lastText);
        void saveUnreadState(authUser.id, characterId, {
          unreadCount: nextUnread,
          lastMessageZh: lane.zh || current?.lastMessage?.zh || '',
          lastMessageJa: lane.ja || current?.lastMessage?.ja || '',
          lastMessageEn: lane.en || current?.lastMessage?.en || '',
          lastMessageAt: at,
        });
      }
    },
    [authUser, characters, language]
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
    // Simulated incoming: random character pings when not inside that chat.
    const interval = window.setInterval(() => {
      const now = Date.now();
      const eligible = characters.filter(c => c.isOnline);
      if (eligible.length === 0) return;
      const pick = eligible[Math.floor(Math.random() * eligible.length)]!;
      const inChat = window.location.pathname === `/chat/${pick.id}`;
      if (inChat) return;
      const text = pickIncomingPing(pick.id, language);
      void insertMessage(authUser.id, {
        characterId: pick.id,
        sender: 'fumo',
        text,
      });
      updateConversationMeta(pick.id, text, now, { incrementUnread: true });
    }, 28_000 + Math.floor(Math.random() * 15_000));
    return () => window.clearInterval(interval);
  }, [authUser, characters, language, updateConversationMeta]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
                userProfile={userProfile}
                onUserProfileChange={setUserProfile}
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
