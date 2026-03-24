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
}

export const BottomNav: React.FC<BottomNavProps> = ({ language }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cream-card border-t-2 border-cream-border border-dashed px-4 pb-6 pt-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-2xl",
            isActive ? "bg-cream-accent/30 scale-110" : "opacity-60 grayscale"
          )}
        >
          <tab.icon className="w-6 h-6 text-cream-text" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {tab.label[language]}
          </span>
        </NavLink>
      ))}
    </nav>
  );
};
