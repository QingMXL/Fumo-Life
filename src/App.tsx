import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { type Language, type UserProfile, type Character, type Message, CHARACTERS as INITIAL_CHARACTERS } from './types';
import { BottomNav } from './components/BottomNav';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { ContactsPage } from './pages/ContactsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MePage } from './pages/MePage';
import { pickIncomingPing } from './data/inboxNpcPings';

const USER_PROFILE_KEY = 'fumo-life-user-profile';
const DISCOVER_UNREAD_KEY = 'fumo-discover-unread-count';
const CHAT_STORAGE_PREFIX = 'fumo-chat-';
const CHAT_PERSISTENCE_ENABLED = false;

function chatStorageKey(characterId: string, language: Language) {
  return `${CHAT_STORAGE_PREFIX}${characterId}:${language}`;
}

function loadStoredChat(characterId: string, language: Language): Message[] | null {
  if (!CHAT_PERSISTENCE_ENABLED) return null;
  try {
    const raw = localStorage.getItem(chatStorageKey(characterId, language));
    if (!raw) return null;
    const arr = JSON.parse(raw) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    return arr.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return null;
  }
}

function saveStoredChat(characterId: string, language: Language, msgs: Message[]) {
  if (!CHAT_PERSISTENCE_ENABLED) return;
  localStorage.setItem(
    chatStorageKey(characterId, language),
    JSON.stringify(msgs.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })))
  );
}

function lastTexts(msgs: Message[], count: number) {
  const out: string[] = [];
  for (let i = msgs.length - 1; i >= 0 && out.length < count; i--) {
    const m = msgs[i]!;
    if (m.sender === 'fumo' && m.text.trim().length > 0) out.push(m.text.trim());
  }
  return out;
}

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
  const [language, setLanguage] = useState<Language>('zh');
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [discoverUnreadCount, setDiscoverUnreadCount] = useState(() => {
    const raw = localStorage.getItem(DISCOVER_UNREAD_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const updateBond = useCallback((id: string, amount: number) => {
    setCharacters(prev => prev.map(c => 
      c.id === id
        ? {
            ...c,
            bondLevel: Math.min(10, c.bondLevel + amount),
            lastBondAt: Date.now(),
          }
        : c
    ));
  }, []);

  const markChatRead = useCallback((id: string) => {
    setCharacters(prev =>
      prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

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
    },
    [language]
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
            return { ...c, bondLevel: Math.max(0, c.bondLevel - 1) };
          }
          return c;
        })
      );
    }, 70_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    // Simulated incoming: random character pings when not inside that chat.
    const interval = window.setInterval(() => {
      const now = Date.now();
      const eligible = characters.filter(c => c.isOnline);
      if (eligible.length === 0) return;
      const pick = eligible[Math.floor(Math.random() * eligible.length)]!;
      const inChat = window.location.pathname === `/chat/${pick.id}`;
      if (inChat) return;
      const existing = loadStoredChat(pick.id, language) ?? [];
      const recent = new Set(lastTexts(existing, 4));
      let text = '';
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = pickIncomingPing(pick.id, language);
        if (!recent.has(candidate.trim())) {
          text = candidate;
          break;
        }
        text = candidate;
      }
      const msg: Message = {
        id: `in-${now}-${Math.random().toString(36).slice(2, 7)}`,
        characterId: pick.id,
        sender: 'fumo',
        text,
        timestamp: new Date(now),
      };
      const next = [...existing, msg].slice(-200);
      saveStoredChat(pick.id, language, next);
      updateConversationMeta(pick.id, text, now, { incrementUnread: true });
    }, 28_000 + Math.floor(Math.random() * 15_000));
    return () => window.clearInterval(interval);
  }, [characters, language, updateConversationMeta]);

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
