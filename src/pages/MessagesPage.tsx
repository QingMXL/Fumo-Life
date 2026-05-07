import React, { useEffect, useState } from 'react';
import { type Language, type Character } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { resolvePublicAssetUrl } from '@/lib/utils';

interface MessagesPageProps {
  language: Language;
  characters: Character[];
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ language, characters }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[NAV][Messages] mounted', { path: window.location.pathname, ts: Date.now() });
  }, []);

  const goChat = (id: string) => {
    console.log('[NAV][Messages] click card', { id, from: window.location.pathname, ts: Date.now() });
    navigate(`/chat/${id}`);
    console.log('[NAV][Messages] navigate()', { target: `/chat/${id}`, now: window.location.pathname });
    // 路由异常时兜底：强制跳转，确保“点了有反应”
    window.setTimeout(() => {
      console.log('[NAV][Messages] 120ms check', {
        target: `/chat/${id}`,
        current: window.location.pathname,
      });
      if (window.location.pathname !== `/chat/${id}`) {
        console.warn('[NAV][Messages] fallback location.assign', { target: `/chat/${id}` });
        window.location.assign(`/chat/${id}`);
      }
    }, 120);
  };

  const filteredCharacters = characters
    .filter(fumo => fumo.name[language].toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const au = a.unreadCount > 0 ? 1 : 0;
      const bu = b.unreadCount > 0 ? 1 : 0;
      if (bu !== au) return bu - au;
      return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
    });

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      <header className="fumo-header-sky px-4 pt-5 pb-16">
        <div className="relative flex h-10 items-center justify-center">
          <h1 className="fumo-title-app text-[1.35rem]">Fumo² Life</h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 kawaii-search-pill">
            <Search className="h-4 w-4 text-cream-text/70" strokeWidth={2.25} />
            <input
              type="text"
              placeholder={language === 'zh' ? '搜索…' : language === 'ja' ? '検索…' : 'Search…'}
              className="w-[4.5rem] border-none bg-transparent text-xs font-bold text-cream-text placeholder:text-cream-text/40 focus:ring-0"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="fumo-page-sheet -mt-10 px-3 pt-5">
        <div className="divide-y divide-cream-border/35 border-cream-border/25">
          {filteredCharacters.map((fumo, index) => (
            <motion.div
              key={fumo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => goChat(fumo.id)}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-transparent border-dashed py-4 pl-1 pr-2 text-left transition-all hover:border-cream-border/55 hover:bg-white/40 active:scale-[0.99]"
              >
                <div className="relative shrink-0">
                  <img
                    src={resolvePublicAssetUrl(fumo.avatar) ?? fumo.avatar}
                    alt={fumo.name[language]}
                    className="h-14 w-14 rounded-full border-[3px] border-white object-cover fumo-shadow"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-base font-extrabold text-cream-text">{fumo.name[language]}</h3>
                    <span className="shrink-0 text-[11px] font-bold text-cream-text/45">{fumo.lastTime}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-cream-text/65">
                      {fumo.lastMessage?.[language] ?? ''}
                    </p>
                    {fumo.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[#ff5a5a] px-2 py-0.5 text-center text-[10px] font-black text-white fumo-shadow ring-2 ring-white">
                        {fumo.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
