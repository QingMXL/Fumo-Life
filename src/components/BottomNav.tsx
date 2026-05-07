import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Users, Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'messages', label: { zh: '消息', ja: 'メッセージ', en: 'Messages' }, icon: MessageCircle, path: '/' },
  { id: 'contacts', label: { zh: '通讯录', ja: '連絡先', en: 'Contacts' }, icon: Users, path: '/contacts' },
  { id: 'discover', label: { zh: '发现', ja: '発見', en: 'Discover' }, icon: Compass, path: '/discover' },
  { id: 'me', label: { zh: '我的', ja: '自分', en: 'Me' }, icon: User, path: '/me' },
];

interface BottomNavProps {
  language: 'zh' | 'ja' | 'en';
  unreadMessagesCount: number;
  unreadDiscoverCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ language, unreadMessagesCount, unreadDiscoverCount }) => {
  return (
    <nav className="bottom-nav-kawaii fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-md justify-around items-center">
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1.5 min-w-[4.25rem]",
            isActive ? "nav-tab-active scale-105" : "opacity-70 hover:opacity-100"
          )}
        >
          <div className="relative">
            <tab.icon className="w-6 h-6 text-cream-text" strokeWidth={2.35} />
            {tab.id === 'messages' && unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#FF4D4D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white fumo-shadow">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
            {tab.id === 'discover' && unreadDiscoverCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#FF4D4D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white fumo-shadow">
                {unreadDiscoverCount > 99 ? '99+' : unreadDiscoverCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-extrabold tracking-wide text-cream-text">
            {tab.label[language]}
          </span>
        </NavLink>
      ))}
    </nav>
  );
};
