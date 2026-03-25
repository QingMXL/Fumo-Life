import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { type Language, type UserProfile, CHARACTERS as INITIAL_CHARACTERS } from './types';
import { BottomNav } from './components/BottomNav';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { ContactsPage } from './pages/ContactsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MePage } from './pages/MePage';

const USER_PROFILE_KEY = 'fumo-life-user-profile';

function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return migrateUserProfile(JSON.parse(raw) as UserProfile);
  } catch {
    /* ignore */
  }
  return {
    displayName: '神社客',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&h=200&auto=format&fit=crop',
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

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const updateBond = useCallback((id: string, amount: number) => {
    setCharacters(prev => prev.map(c => 
      c.id === id ? { ...c, bondLevel: Math.min(10, c.bondLevel + amount) } : c
    ));
  }, []);

  const markChatRead = useCallback((id: string) => {
    setCharacters(prev =>
      prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

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
              />
            }
          />
          <Route path="/contacts" element={<ContactsPage language={language} characters={characters} />} />
          <Route
            path="/discover"
            element={
              <DiscoverPage
                language={language}
                userProfile={userProfile}
                characters={characters}
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
          <Route path="/" element={<BottomNav language={language} />} />
          <Route path="/contacts" element={<BottomNav language={language} />} />
          <Route path="/discover" element={<BottomNav language={language} />} />
          <Route path="/me" element={<BottomNav language={language} />} />
        </Routes>
      </div>
    </Router>
  );
}
