import React, { useState, useEffect } from 'react';
import { type Language, type Character, type UserProfile } from '@/types';
import { Settings, Camera, Heart, Globe, Bell, Shield, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchMyAlbumImages, type AlbumImageItem } from '@/services/cloudStore';
import { resolvePublicAssetUrl } from '@/lib/utils';

interface MePageProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  characters: Character[];
  userId: string;
  userProfile: UserProfile;
  onUserProfileChange: (p: UserProfile) => void;
  onSwitchUser: () => void;
  onClearChats: () => Promise<void>;
}

export const MePage: React.FC<MePageProps> = ({
  language,
  setLanguage,
  characters,
  userId,
  userProfile,
  onUserProfileChange,
  onSwitchUser,
  onClearChats,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.displayName);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);
  const [albumPhotos, setAlbumPhotos] = useState<AlbumImageItem[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const totalBond = characters.reduce((acc, c) => acc + c.bondLevel, 0);

  const [notifMessages, setNotifMessages] = useState(true);
  const [notifMoments, setNotifMoments] = useState(true);

  useEffect(() => {
    setName(userProfile.displayName);
  }, [userProfile.displayName]);

  useEffect(() => {
    if (!showAlbum) return;
    setAlbumLoading(true);
    void fetchMyAlbumImages(userId)
      .then(setAlbumPhotos)
      .finally(() => setAlbumLoading(false));
  }, [showAlbum, userId]);

  useEffect(() => {
    // 入口角标也显示真实数量：页面加载时预取一次。
    void fetchMyAlbumImages(userId).then(setAlbumPhotos);
  }, [userId]);

  const handleAvatarChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        onUserProfileChange({ ...userProfile, avatarUrl: url });
      }
    };
    input.click();
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      <header className="fumo-header-sky px-4 pb-12 pt-5 text-center">
        <h1 className="fumo-title-app text-xl font-black tracking-tight">
          {language === 'zh' ? '我的' : language === 'ja' ? '自分' : 'Me'}
        </h1>
        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/80">Profile</p>
      </header>

      <div className="fumo-page-sheet -mt-8 px-4 pb-6 pt-6">
      <header className="mb-8 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-cream-accent/20 stitched-border flex items-center justify-center overflow-hidden">
            <img 
              src={resolvePublicAssetUrl(userProfile.avatarUrl) ?? userProfile.avatarUrl} 
              className="w-full h-full object-cover" 
              alt="User"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={handleAvatarChange}
            className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full stitched-border shadow-sm hover:scale-110 active:scale-95 transition-transform"
          >
            <Camera className="w-4 h-4 opacity-60" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          {isEditing ? (
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="bg-white stitched-border rounded-full px-4 py-1 text-sm font-bold focus:outline-none"
              autoFocus
              onBlur={() => {
                onUserProfileChange({ ...userProfile, displayName: name.trim() || userProfile.displayName });
                setIsEditing(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onUserProfileChange({ ...userProfile, displayName: name.trim() || userProfile.displayName });
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <h2 className="text-xl font-black text-cream-text">{userProfile.displayName}</h2>
          )}
          <button 
            onClick={() => {
              if (!isEditing) setName(userProfile.displayName);
              setIsEditing(!isEditing);
            }}
            className="p-1 opacity-40 hover:opacity-100 transition-opacity"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Level 12 Collector</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setShowAlbum(true)}
          className="stitched-card flex flex-col items-center justify-center gap-2 py-6 hover:bg-cream-accent/10 transition-colors"
        >
          <Camera className="w-6 h-6 opacity-60" />
          <span className="text-xs font-bold uppercase">{language === 'zh' ? '相册' : language === 'ja' ? 'アルバム' : 'Album'}</span>
          <span className="text-xl font-black">{albumPhotos.length}</span>
        </button>
        <div className="stitched-card flex flex-col items-center justify-center gap-2 py-6">
          <Heart className="w-6 h-6 opacity-60 text-red-400" />
          <span className="text-xs font-bold uppercase">{language === 'zh' ? '羁绊' : language === 'ja' ? '絆' : 'Bonds'}</span>
          <span className="text-xl font-black">{totalBond}</span>
        </div>
      </div>

      <div className="stitched-card space-y-1 p-2">
        <button 
          onClick={() => setShowLanguage(true)}
          className="w-full flex items-center justify-between p-3 hover:bg-cream-accent/10 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 opacity-60" />
            <span className="text-sm font-bold">{language === 'zh' ? '语言设置' : language === 'ja' ? '言語設定' : 'Language'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black opacity-40 uppercase">{language === 'zh' ? '中文' : language === 'ja' ? '日本語' : 'English'}</span>
            <ChevronRight className="w-4 h-4 opacity-20" />
          </div>
        </button>
        
        <div className="h-[1px] bg-cream-border border-dashed mx-3" />
        
        <button 
          onClick={() => setShowNotifications(true)}
          className="w-full flex items-center justify-between p-3 hover:bg-cream-accent/10 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 opacity-60" />
            <span className="text-sm font-bold">{language === 'zh' ? '通知管理' : language === 'ja' ? '通知設定' : 'Notifications'}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-20" />
        </button>

        <div className="h-[1px] bg-cream-border border-dashed mx-3" />

        <button 
          onClick={() => setShowPrivacy(true)}
          className="w-full flex items-center justify-between p-3 hover:bg-cream-accent/10 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 opacity-60" />
            <span className="text-sm font-bold">{language === 'zh' ? '隐私与安全' : language === 'ja' ? 'プライバシー' : 'Privacy'}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-20" />
        </button>
      </div>

      <div className="mt-4 stitched-card p-2 space-y-2">
        <button
          type="button"
          onClick={async () => {
            const ok = window.confirm(
              language === 'zh'
                ? '确认清空所有聊天内容？该操作不可恢复。'
                : language === 'ja'
                  ? 'すべてのチャット履歴を削除しますか？この操作は元に戻せません。'
                  : 'Clear all chat contents? This action cannot be undone.'
            );
            if (!ok) return;
            await onClearChats();
          }}
          className="w-full p-3 rounded-2xl bg-white hover:bg-cream-accent/10 stitched-border text-sm font-bold transition-colors"
        >
          {language === 'zh' ? '清空所有聊天内容' : language === 'ja' ? 'チャット内容をすべて削除' : 'Clear All Chat Contents'}
        </button>
        <button
          type="button"
          onClick={onSwitchUser}
          className="w-full p-3 rounded-2xl bg-white hover:bg-cream-accent/10 stitched-border text-sm font-bold transition-colors"
        >
          {language === 'zh' ? '切换用户' : language === 'ja' ? 'ユーザー切替' : 'Switch User'}
        </button>
        <button
          type="button"
          onClick={onSwitchUser}
          className="w-full p-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 stitched-border text-sm font-bold transition-colors"
        >
          {language === 'zh' ? '退出登录' : language === 'ja' ? 'ログアウト' : 'Logout'}
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showLanguage && (
          <Modal title={language === 'zh' ? '语言设置' : '言語設定'} onClose={() => setShowLanguage(false)}>
            <div className="flex flex-col gap-2">
              {(['zh', 'ja', 'en'] as Language[]).map(l => (
                <button 
                  key={l}
                  onClick={() => { setLanguage(l); setShowLanguage(false); }}
                  className={cn(
                    "p-4 rounded-2xl stitched-border font-bold transition-all",
                    language === l ? "bg-cream-accent text-cream-text" : "bg-white opacity-60"
                  )}
                >
                  {l === 'zh' ? '简体中文' : l === 'ja' ? '日本語' : 'English'}
                </button>
              ))}
            </div>
          </Modal>
        )}

        {showNotifications && (
          <Modal title={language === 'zh' ? '通知管理' : '通知設定'} onClose={() => setShowNotifications(false)}>
            <div className="space-y-4">
              <button 
                onClick={() => setNotifMessages(!notifMessages)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl stitched-border hover:bg-cream-accent/5 transition-colors"
              >
                <span className="text-sm font-bold">{language === 'zh' ? 'Fumo 消息通知' : 'Fumoメッセージ通知'}</span>
                <div className={cn(
                  "w-12 h-6 rounded-full stitched-border border-white transition-colors relative",
                  notifMessages ? "bg-green-400" : "bg-gray-200"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    notifMessages ? "right-0.5" : "left-0.5"
                  )} />
                </div>
              </button>
              <button 
                onClick={() => setNotifMoments(!notifMoments)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl stitched-border hover:bg-cream-accent/5 transition-colors"
              >
                <span className="text-sm font-bold">{language === 'zh' ? '朋友圈动态提醒' : 'モーメンツ通知'}</span>
                <div className={cn(
                  "w-12 h-6 rounded-full stitched-border border-white transition-colors relative",
                  notifMoments ? "bg-green-400" : "bg-gray-200"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    notifMoments ? "right-0.5" : "left-0.5"
                  )} />
                </div>
              </button>
            </div>
          </Modal>
        )}

        {showPrivacy && (
          <Modal title={language === 'zh' ? '隐私与安全' : 'プライバシー'} onClose={() => setShowPrivacy(false)}>
            <div className="text-xs space-y-4 opacity-70 leading-relaxed">
              <p>Fumo² Life 致力于保护您的隐私。我们仅收集必要的互动数据以优化 AI 体验。</p>
              <p>您的聊天记录经过加密处理，且您可以随时在设置中清除本地缓存。</p>
              <p>我们不会向任何第三方分享您的个人数据。</p>
            </div>
          </Modal>
        )}

        {showAlbum && (
          <Modal title={language === 'zh' ? 'Fumo 相册' : 'アルバム'} onClose={() => setShowAlbum(false)}>
            <div className="grid grid-cols-2 gap-3">
              {albumLoading ? (
                <div className="col-span-2 text-center text-xs opacity-60 py-8">
                  {language === 'zh' ? '加载中...' : language === 'ja' ? '読み込み中...' : 'Loading...'}
                </div>
              ) : albumPhotos.length === 0 ? (
                <div className="col-span-2 text-center text-xs opacity-60 py-8">
                  {language === 'zh' ? '暂无图片' : language === 'ja' ? '画像がありません' : 'No images yet'}
                </div>
              ) : (
                albumPhotos.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setPreviewImage(item.imageUrl)}
                    className="aspect-square rounded-2xl overflow-hidden stitched-border border-dashed"
                  >
                    <img src={resolvePublicAssetUrl(item.imageUrl) ?? item.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </button>
                ))
              )}
            </div>
          </Modal>
        )}
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <img
              src={resolvePublicAssetUrl(previewImage) ?? previewImage ?? ''}
              className="max-w-full max-h-full rounded-2xl stitched-border border-white"
              alt=""
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 text-center">
        <p className="text-[10px] font-bold opacity-20 uppercase tracking-[0.3em]">Fumo² Life v2.0.0</p>
      </div>
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end"
    onClick={onClose}
  >
    <motion.div 
      initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
      className="w-full bg-cream-card rounded-t-3xl p-6 stitched-border border-b-0 max-h-[80vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-lg">{title}</h3>
        <button onClick={onClose} className="p-2 bg-cream-accent/20 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
