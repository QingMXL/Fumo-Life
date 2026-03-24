import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { type Language, CHARACTERS as INITIAL_CHARACTERS } from './types';
import { BottomNav } from './components/BottomNav';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { ContactsPage } from './pages/ContactsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MePage } from './pages/MePage';

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);

  const updateBond = (id: string, amount: number) => {
    setCharacters(prev => prev.map(c => 
      c.id === id ? { ...c, bondLevel: Math.min(10, c.bondLevel + amount) } : c
    ));
  };

  return (
    <Router>
      <div className="min-h-screen bg-cream-bg text-cream-text selection:bg-cream-accent/30">
        <Routes>
          <Route path="/" element={<MessagesPage language={language} characters={characters} />} />
          <Route path="/chat/:id" element={<ChatPage language={language} characters={characters} onUpdateBond={updateBond} />} />
          <Route path="/contacts" element={<ContactsPage language={language} characters={characters} />} />
          <Route path="/discover" element={<DiscoverPage language={language} />} />
          <Route path="/me" element={<MePage language={language} setLanguage={setLanguage} characters={characters} />} />
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
