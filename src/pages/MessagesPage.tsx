import React, { useState } from 'react';
import { type Language, type Character } from '@/types';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

interface MessagesPageProps {
  language: Language;
  characters: Character[];
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ language, characters }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = characters.filter(fumo => 
    fumo.name[language].toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black tracking-tighter text-cream-text">Fumo² Life</h1>
        <div className="flex items-center gap-2 bg-cream-accent/20 rounded-full px-3 py-1 stitched-border">
          <Search className="w-4 h-4 opacity-60" />
          <input 
            type="text" 
            placeholder={language === 'zh' ? '搜索...' : language === 'ja' ? '検索...' : 'Search...'}
            className="bg-transparent border-none focus:ring-0 text-xs w-20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="space-y-4">
        {filteredCharacters.map((fumo) => (
          <Link
            key={fumo.id}
            to={`/chat/${fumo.id}`}
            className="block stitched-card hover:translate-y-[-2px] transition-transform active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={fumo.avatar}
                  alt={fumo.name[language]}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white fumo-shadow"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-lg truncate">{fumo.name[language]}</h3>
                  <span className="text-xs opacity-40">{fumo.lastTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm opacity-60 truncate">
                    {fumo.lastMessage}
                  </p>
                  {fumo.unreadCount > 0 && (
                    <div className="ml-2 bg-[#FF4D4D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center fumo-shadow">
                      {fumo.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
