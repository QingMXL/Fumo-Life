import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CHARACTERS,
  type Character,
  type Language,
  type Moment,
  type MomentComment,
  type UserProfile,
} from '@/types';
import { Heart, MessageCircle, Share2, Plus, Camera, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { buildEngagementForUserPost } from '@/data/momentNpcReplies';
import { CHARACTER_SEED_MOMENTS } from '@/data/characterSeedMoments';
import { generateAiMomentCommentsForUserPost } from '@/services/gemini';
import {
  createCharacterComment,
  createUserComment,
  createUserMoment,
  deleteUserMoment,
  ensureSeedCharacterMoments,
  fetchMomentsFeed,
  refreshCharacterMomentImagesByAi,
  setLike,
  subscribeMomentsRefresh,
} from '@/services/cloudStore';

function newCommentId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const FIXED_USER_NAME = '神社客';

interface DiscoverPageProps {
  language: Language;
  userId: string;
  userProfile: UserProfile;
  characters: Character[];
  onUnreadCountChange: (count: number) => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  language,
  userId,
  userProfile,
  characters,
  onUnreadCountChange,
}) => {
  const [moments, setMoments] = useState<Moment[]>([]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState<string | null>(null);
  const [likedMoments, setLikedMoments] = useState<Set<string>>(new Set());
  const npcCommentTimersRef = useRef<number[]>([]);
  /** 首次拉取完成时间：此前评论视为历史静态；仅之后新评论播放入场动画。 */
  const [feedHydrateAt, setFeedHydrateAt] = useState<number | null>(null);

  const reloadFeed = async () => {
    const { moments: next, likedMomentIds } = await fetchMomentsFeed(userId);
    setMoments(next);
    setLikedMoments(likedMomentIds);
    setFeedHydrateAt(prev => prev ?? Date.now());
  };

  useEffect(() => {
    let alive = true;
    setFeedHydrateAt(null);
    (async () => {
      await ensureSeedCharacterMoments(CHARACTER_SEED_MOMENTS);
      if (!alive) return;
      await reloadFeed();
      // 后台修复旧动态占位图：改成与文案匹配的 AI 图（Nano Banana/Gemini）。
      const changed = await refreshCharacterMomentImagesByAi(4);
      if (alive && changed > 0) await reloadFeed();
    })();
    const unsub = subscribeMomentsRefresh(() => {
      void reloadFeed();
    });
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});

  // For discover unread: only count NEW character-comments on USER-authored moments.
  const readBaseline = useRef<Record<string, { characterCommentsRead: number }>>({});
  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    let changed = false;
    moments.forEach(m => {
      if (!(m.id in readBaseline.current)) {
        const initialCharacterComments =
          m.authorType === 'user'
            ? m.comments.filter(c => c.authorType === 'character').length
            : 0;
        readBaseline.current[m.id] = { characterCommentsRead: initialCharacterComments };
        changed = true;
      }
    });
    if (changed) setReadTick(t => t + 1);
  }, [moments]);

  const markMomentRead = (momentId: string, currentCharacterComments: number) => {
    readBaseline.current[momentId] = { characterCommentsRead: currentCharacterComments };
    setReadTick(x => x + 1);
  };

  const getMomentUnreadCharacterComments = (m: Moment) => {
    void readTick;
    if (m.authorType !== 'user') return 0;
    const b = readBaseline.current[m.id];
    const now = m.comments.filter(c => c.authorType === 'character').length;
    const read = b?.characterCommentsRead ?? 0;
    return Math.max(0, now - read);
  };

  const unreadMomentsCount = useMemo(
    () => moments.filter(m => getMomentUnreadCharacterComments(m) > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moments, readTick]
  );

  useEffect(() => {
    onUnreadCountChange(unreadMomentsCount);
  }, [onUnreadCountChange, unreadMomentsCount]);

  const unreadCommentsTotal = useMemo(
    () => moments.reduce((acc, m) => acc + getMomentUnreadCharacterComments(m), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moments, readTick]
  );

  useEffect(() => {
    // The BottomNav badge uses unread *moments* count (per your choice B earlier),
    // but keep this in case we later want “comment count” without changing behavior.
    void unreadCommentsTotal;
  }, [unreadCommentsTotal]);

  const handleLike = async (id: string) => {
    const wasLiked = likedMoments.has(id);
    setLikedMoments(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setMoments(m =>
      m.map(item =>
        item.id === id ? { ...item, likes: item.likes + (wasLiked ? -1 : 1) } : item
      )
    );
    await setLike(userId, id, !wasLiked);
  };

  const handleCommentSubmit = async (momentId: string) => {
    const text = commentInputs[momentId];
    if (!text?.trim()) return;

    const comment: MomentComment = {
      id: newCommentId(),
      authorType: 'user',
      userDisplayName: FIXED_USER_NAME,
      userAvatarUrl: userProfile.avatarUrl,
      createdAt: new Date(),
      text: { zh: text.trim(), ja: text.trim(), en: text.trim() },
    };

    setMoments(prev =>
      prev.map(m => (m.id === momentId ? { ...m, comments: [...m.comments, comment] } : m))
    );
    setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
    await createUserComment(userId, momentId, {
      zh: text.trim(),
      ja: text.trim(),
      en: text.trim(),
    });
  };

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    // 优先走 Gemini 生成角色评论；失败时回退静态模板，保证可用性。
    let aiComments: MomentComment[] = [];
    try {
      aiComments = await generateAiMomentCommentsForUserPost(
        characters,
        language,
        newPostContent.trim(),
        5
      );
    } catch {
      aiComments = [];
    }
    const engagement = aiComments.length > 0
      ? { likesDelta: aiComments.length, comments: aiComments }
      : buildEngagementForUserPost(characters, 5);
    const newMoment: Moment = {
      id: Date.now().toString(),
      authorType: 'user',
      content: {
        zh: newPostContent.trim(),
        ja: newPostContent.trim(),
        en: newPostContent.trim(),
      },
      imageUrl: newPostImageUrl ?? undefined,
      timestamp: new Date(),
      likes: 0,
      comments: [],
    };
    setMoments(prev => [newMoment, ...prev]);
    setNewPostContent('');
    setNewPostImageUrl(null);
    setShowPostModal(false);
    await createUserMoment(userId, {
      content: newMoment.content,
      imageUrl: newMoment.imageUrl,
    });
    // 角色自动互动写入云端
    const { moments: refreshed } = await fetchMomentsFeed(userId);
    const created = refreshed.find(m => m.authorType === 'user' && m.content.zh === newMoment.content.zh);
    if (created) {
      // 仿微信：评论随机顺序、随机角色、按间隔逐条出现，避免一次性刷出。
      const queue = shuffle(engagement.comments);
      let delay = 800 + Math.floor(Math.random() * 1000);
      queue.forEach(c => {
        const timer = window.setTimeout(() => {
          void createCharacterComment(created.id, c);
        }, delay);
        npcCommentTimersRef.current.push(timer);
        delay += 1500 + Math.floor(Math.random() * 2200);
      });
    }
    await reloadFeed();
  };

  const handleDeleteMoment = async (moment: Moment) => {
    if (moment.authorType !== 'user') return;
    const ok = window.confirm(
      language === 'zh'
        ? '确认删除这条动态？删除后无法恢复。'
        : language === 'ja'
          ? 'この投稿を削除しますか？削除後は復元できません。'
          : 'Delete this moment? This action cannot be undone.'
    );
    if (!ok) return;
    setMoments(prev => prev.filter(m => m.id !== moment.id));
    try {
      await deleteUserMoment(userId, moment.id);
    } catch (e) {
      console.error('deleteUserMoment failed:', e);
      await reloadFeed();
    }
  };

  const commentShouldEnterAnimate = (comment: MomentComment) => {
    if (feedHydrateAt == null) return false;
    const t = comment.createdAt?.getTime() ?? 0;
    return t > feedHydrateAt;
  };

  const renderComment = (comment: MomentComment) => {
    const enter = commentShouldEnterAnimate(comment);
    const boxClass =
      'flex gap-2 text-xs bg-cream-accent/10 p-2 rounded-xl border border-cream-border border-dashed';

    if (comment.authorType === 'user') {
      const name = comment.userDisplayName ?? FIXED_USER_NAME;
      const avatar = comment.userAvatarUrl ?? userProfile.avatarUrl;
      const inner = (
        <>
          <img
            src={avatar}
            className="w-7 h-7 rounded-full border border-white shrink-0 object-cover"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="font-bold mr-1">{name}</span>
            <span className="opacity-70">{comment.text[language]}</span>
          </div>
        </>
      );
      return enter ? (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={boxClass}
        >
          {inner}
        </motion.div>
      ) : (
        <div key={comment.id} className={boxClass}>
          {inner}
        </div>
      );
    }
    const commenter = CHARACTERS.find(c => c.id === comment.characterId);
    const inner = (
      <>
        <img
          src={commenter?.avatar}
          className="w-7 h-7 rounded-full border border-white shrink-0 object-cover"
          alt=""
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <span className="font-bold mr-1">{commenter?.name[language]}:</span>
          <span className="opacity-70">{comment.text[language]}</span>
        </div>
      </>
    );
    return enter ? (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={boxClass}
      >
        {inner}
      </motion.div>
    ) : (
      <div key={comment.id} className={boxClass}>
        {inner}
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto relative min-h-screen">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-cream-text">
            {language === 'zh' ? '发现' : language === 'ja' ? '発見' : 'Discover'}
          </h1>
          <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">Fumo Moments</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPostModal(true)}
          className="bg-cream-text text-white p-3 rounded-full fumo-shadow hover:scale-110 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="space-y-8">
        {moments.map(moment => {
          const poster: Character | undefined =
            moment.authorType === 'character' && moment.characterId
              ? CHARACTERS.find(c => c.id === moment.characterId)
              : undefined;
          const posterName =
            moment.authorType === 'user' ? FIXED_USER_NAME : poster?.name[language];
          const posterAvatar =
            moment.authorType === 'user' ? userProfile.avatarUrl : poster?.avatar;
          const isLiked = likedMoments.has(moment.id);
          const unread = getMomentUnreadCharacterComments(moment) > 0;
          const unreadCount = getMomentUnreadCharacterComments(moment);
          const currentCharacterComments =
            moment.authorType === 'user'
              ? moment.comments.filter(c => c.authorType === 'character').length
              : 0;

          return (
            <div key={moment.id} className="stitched-card p-0 overflow-hidden relative">
              {unread && (
                <span
                  className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-[#FF4D4D] text-white text-[10px] font-black border-2 border-white fumo-shadow leading-none"
                  title={
                    language === 'zh'
                      ? `+${unreadCount} 新评论`
                      : language === 'ja'
                        ? `+${unreadCount} 新着コメント`
                        : `+${unreadCount} New comments`
                  }
                >
                  {`+${unreadCount}`}
                </span>
              )}
              {moment.authorType === 'user' && (
                <button
                  type="button"
                  onClick={() => void handleDeleteMoment(moment)}
                  className={cn(
                    "absolute z-10 p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-rose-50 text-rose-500 transition-colors",
                    unread ? "top-2 right-14" : "top-2 right-2"
                  )}
                  title={language === 'zh' ? '删除动态' : language === 'ja' ? '投稿を削除' : 'Delete moment'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-cream-accent/5 transition-colors"
                onClick={() =>
                  markMomentRead(moment.id, currentCharacterComments)
                }
              >
                <img
                  src={posterAvatar}
                  className="w-10 h-10 rounded-full border-2 border-white fumo-shadow object-cover"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-sm">{posterName}</h3>
                  <span className="text-[10px] opacity-40">
                    {formatDistanceToNow(moment.timestamp)} ago
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="w-full text-left px-4 pb-3 hover:bg-cream-accent/5 transition-colors"
                onClick={() =>
                  markMomentRead(moment.id, currentCharacterComments)
                }
              >
                <p className="text-sm leading-relaxed">{moment.content[language]}</p>
              </button>

              {moment.imageUrl ? (
                <img
                  src={moment.imageUrl}
                  className="w-full h-64 object-cover border-y-2 border-cream-border border-dashed"
                  alt="Moment"
                  referrerPolicy="no-referrer"
                />
              ) : null}

              <div className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleLike(moment.id)}
                    className={cn(
                      'flex items-center gap-1 transition-all active:scale-125 shrink-0',
                      isLiked ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        isLiked ? 'text-red-500 fill-red-500' : 'text-red-400'
                      )}
                    />
                    <span className="text-xs font-bold">{moment.likes}</span>
                  </button>
                  {moment.likedByCharacters && moment.likedByCharacters.length > 0 ? (
                    <div
                      className="flex items-center -space-x-2 pl-1"
                      title={
                        language === 'zh'
                          ? '角色们也点了赞'
                          : language === 'ja'
                            ? 'キャラクターからのいいね'
                            : 'Character likes'
                      }
                    >
                      {moment.likedByCharacters.slice(0, 8).map(cid => {
                        const ch = CHARACTERS.find(c => c.id === cid);
                        return (
                          <img
                            key={`${moment.id}-${cid}`}
                            src={ch?.avatar}
                            alt=""
                            className="w-7 h-7 rounded-full border-2 border-white object-cover fumo-shadow"
                            referrerPolicy="no-referrer"
                          />
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1 opacity-60">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-bold">{moment.comments.length}</span>
                  </div>
                </div>
                <button type="button" className="opacity-40 hover:opacity-100">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {moment.comments.length > 0 && (
                <div className="px-4 pb-4 space-y-2">{moment.comments.map(renderComment)}</div>
              )}

              <div className="px-4 pb-4 flex gap-2">
                <input
                  type="text"
                  value={commentInputs[moment.id] || ''}
                  onChange={e =>
                    setCommentInputs(prev => ({ ...prev, [moment.id]: e.target.value }))
                  }
                  onFocus={() =>
                    markMomentRead(moment.id, currentCharacterComments)
                  }
                  onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(moment.id)}
                  placeholder={
                    language === 'zh'
                      ? '发表评论...'
                      : language === 'ja'
                        ? 'コメントを書く...'
                        : 'Add a comment...'
                  }
                  className="flex-1 bg-cream-accent/10 rounded-full px-4 py-2 text-xs border border-cream-border border-dashed focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCommentSubmit(moment.id)}
                  className="text-xs font-bold text-cream-text opacity-60 hover:opacity-100 transition-opacity"
                >
                  {language === 'zh' ? '发送' : language === 'ja' ? '送信' : 'Send'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-cream-card rounded-3xl p-6 stitched-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg">
                  {language === 'zh' ? '发布动态' : language === 'ja' ? '投稿する' : 'New moment'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="p-2 bg-cream-accent/20 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder={
                  language === 'zh'
                    ? '分享你的想法（可不配图）...'
                    : language === 'ja'
                      ? 'テキストだけでも投稿できます...'
                      : 'Text only is fine...'
                }
                className="w-full h-32 bg-white stitched-border rounded-2xl p-4 text-sm focus:outline-none resize-none mb-4"
              />

              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    // On mobile this often triggers camera; on desktop it's file picker.
                    (input as any).capture = 'environment';
                    input.onchange = (e: any) => {
                      const file: File | undefined = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setNewPostImageUrl(url);
                    };
                    input.click();
                  }}
                  className="flex-1 aspect-square bg-cream-accent/10 rounded-2xl stitched-border border-dashed flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  {newPostImageUrl ? (
                    <img
                      src={newPostImageUrl}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover border border-cream-border border-dashed"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                  <span className="text-[10px] font-bold uppercase">
                    {newPostImageUrl ? (language === 'zh' ? '已添加' : language === 'ja' ? '追加済み' : 'Added') : 'Add Photo'}
                  </span>
                </button>
                <div className="flex-1" />
              </div>

              <button
                type="button"
                onClick={handlePost}
                className="w-full bg-cream-text text-white py-3 rounded-full font-bold fumo-shadow hover:scale-105 active:scale-95 transition-transform"
              >
                {language === 'zh' ? '发布' : language === 'ja' ? '投稿' : 'Post'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
