import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CHARACTERS,
  type Character,
  type Language,
  type Moment,
  type MomentComment,
  type UserProfile,
} from '@/types';
import { Heart, MessageCircle, Download, Plus, Camera, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { fileOrBlobUrlToJpegDataUrl } from '@/lib/imageDataUrl';
import {
  loadDiscoverCommentReadBaseline,
  saveDiscoverCommentReadBaseline,
} from '@/lib/discoverCommentReadBaseline';
import { cn, resolvePublicAssetUrl } from '@/lib/utils';
import { buildEngagementForUserPost } from '@/data/momentNpcReplies';
import { CHARACTER_SEED_MOMENTS } from '@/data/characterSeedMoments';
import { generateAiMomentCommentsForUserPost } from '@/services/gemini';
import {
  createCharacterComment,
  createUserComment,
  createUserMoment,
  deleteUserComment,
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

async function downloadMomentImage(url: string, filenameBase: string) {
  const fetchUrl = resolvePublicAssetUrl(url) ?? url;
  const ext = url.startsWith('data:image/')
    ? (url.match(/^data:image\/(\w+)/)?.[1] ?? 'png')
    : (() => {
        try {
          const u = new URL(fetchUrl, window.location.href);
          const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/);
          return m?.[1]?.toLowerCase() ?? 'png';
        } catch {
          return 'png';
        }
      })();
  const safe = filenameBase.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'moment';
  const filename = `${safe}.${ext}`;
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    const a = document.createElement('a');
    a.href = fetchUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
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
    setMoments([]);
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

  const persistReadBaseline = () => {
    const flat: Record<string, number> = {};
    for (const [k, v] of Object.entries(readBaseline.current)) {
      flat[k] = v.characterCommentsRead;
    }
    saveDiscoverCommentReadBaseline(userId, flat);
  };

  useEffect(() => {
    const flat = loadDiscoverCommentReadBaseline(userId);
    readBaseline.current = Object.fromEntries(
      Object.entries(flat).map(([id, n]) => [id, { characterCommentsRead: n }])
    );
  }, [userId]);

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
    if (changed) {
      persistReadBaseline();
      setReadTick(t => t + 1);
    }
  }, [moments, userId]);

  const markMomentRead = (momentId: string, currentCharacterComments: number) => {
    readBaseline.current[momentId] = { characterCommentsRead: currentCharacterComments };
    persistReadBaseline();
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

  const unreadCommentsTotal = useMemo(
    () => moments.reduce((acc, m) => acc + getMomentUnreadCharacterComments(m), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moments, readTick]
  );

  /** 底部导航「发现」角标：未读「角色评论」条数（非未读动态条数）。 */
  useEffect(() => {
    onUnreadCountChange(unreadCommentsTotal);
  }, [onUnreadCountChange, unreadCommentsTotal]);

  const unreadCommentsLabel =
    language === 'zh' ? '未读评论' : language === 'ja' ? '未読コメント' : 'Unread';

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
      userId,
      userDisplayName: FIXED_USER_NAME,
      userAvatarUrl: userProfile.avatarUrl,
      createdAt: new Date(),
      text: { zh: text.trim(), ja: text.trim(), en: text.trim() },
    };

    const tempId = comment.id;
    setMoments(prev =>
      prev.map(m => (m.id === momentId ? { ...m, comments: [...m.comments, comment] } : m))
    );
    setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
    try {
      const savedId = await createUserComment(userId, momentId, {
        zh: text.trim(),
        ja: text.trim(),
        en: text.trim(),
      });
      if (savedId) {
        setMoments(prev =>
          prev.map(m =>
            m.id === momentId
              ? {
                  ...m,
                  comments: m.comments.map(c => (c.id === tempId ? { ...c, id: savedId } : c)),
                }
              : m
          )
        );
      }
    } catch (e) {
      console.error('createUserComment failed:', e);
      setMoments(prev =>
        prev.map(m =>
          m.id === momentId ? { ...m, comments: m.comments.filter(c => c.id !== tempId) } : m
        )
      );
      setCommentInputs(prev => ({ ...prev, [momentId]: text.trim() }));
    }
  };

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    let imageForMoment: string | undefined;
    const pickedPreview = newPostImageUrl;
    if (pickedPreview) {
      try {
        if (pickedPreview.startsWith('blob:')) {
          imageForMoment = await fileOrBlobUrlToJpegDataUrl(pickedPreview);
          URL.revokeObjectURL(pickedPreview);
        } else {
          imageForMoment = pickedPreview;
        }
      } catch (e) {
        console.error('moment image:', e);
      }
    }
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
      imageUrl: imageForMoment,
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

  const handleDeleteComment = async (momentId: string, comment: MomentComment) => {
    if (comment.authorType !== 'user' || comment.userId !== userId) return;
    const ok = window.confirm(
      language === 'zh'
        ? '删除这条评论？'
        : language === 'ja'
          ? 'このコメントを削除しますか？'
          : 'Delete this comment?'
    );
    if (!ok) return;
    setMoments(prev =>
      prev.map(m =>
        m.id === momentId ? { ...m, comments: m.comments.filter(c => c.id !== comment.id) } : m
      )
    );
    try {
      await deleteUserComment(userId, comment.id);
    } catch (e) {
      console.error('deleteUserComment failed:', e);
      await reloadFeed();
    }
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

  const renderComment = (momentId: string, comment: MomentComment) => {
    const enter = commentShouldEnterAnimate(comment);
    const boxClass =
      'flex gap-2 text-xs bg-cream-accent/10 p-2 rounded-xl border border-cream-border border-dashed items-start justify-between';
    const canDeleteOwn = comment.authorType === 'user' && comment.userId === userId;

    if (comment.authorType === 'user') {
      const name = comment.userDisplayName ?? FIXED_USER_NAME;
      const avatar = comment.userAvatarUrl ?? userProfile.avatarUrl;
      const inner = (
        <div className="flex gap-2 min-w-0 flex-1">
          <img
            src={resolvePublicAssetUrl(avatar) ?? avatar}
            className="w-7 h-7 rounded-full border border-white shrink-0 object-cover"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="font-bold mr-1">{name}</span>
            <span className="opacity-70">{comment.text[language]}</span>
          </div>
        </div>
      );
      const del =
        canDeleteOwn ? (
          <button
            type="button"
            onClick={() => void handleDeleteComment(momentId, comment)}
            className="shrink-0 p-1 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title={language === 'zh' ? '删除评论' : language === 'ja' ? 'コメントを削除' : 'Delete comment'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : null;
      return enter ? (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={boxClass}
        >
          {inner}
          {del}
        </motion.div>
      ) : (
        <div key={comment.id} className={boxClass}>
          {inner}
          {del}
        </div>
      );
    }
    const commenter = CHARACTERS.find(c => c.id === comment.characterId);
    const inner = (
      <div className="flex gap-2 min-w-0 flex-1">
        <img
          src={resolvePublicAssetUrl(commenter?.avatar) ?? commenter?.avatar}
          className="w-7 h-7 rounded-full border border-white shrink-0 object-cover"
          alt=""
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <span className="font-bold mr-1">{commenter?.name[language]}:</span>
          <span className="opacity-70">{comment.text[language]}</span>
        </div>
      </div>
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
    <div className="max-w-md mx-auto min-h-screen pb-24">
      <header className="fumo-header-sky px-4 pb-12 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="fumo-title-app text-xl font-black tracking-tight">
              {language === 'zh' ? '发现' : language === 'ja' ? '発見' : 'Discover'}
            </h1>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/80">
              Fumo Moments
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {unreadCommentsTotal > 0 ? (
              <div
                className="flex max-w-[10.5rem] items-center gap-1.5 rounded-2xl border-2 border-dashed border-white/95 bg-white/30 px-2.5 py-1.5 text-[10px] font-black leading-tight text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-sm"
                title={
                  language === 'zh'
                    ? '你的动态下有角色新评论，点进卡片可标记已读'
                    : language === 'ja'
                      ? 'あなたの投稿に新着コメントがあります'
                      : 'New character replies on your posts — open a card to mark read'
                }
                role="status"
                aria-live="polite"
              >
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#FF4D4D] px-1 text-[9px] text-white ring-2 ring-white/90">
                  {unreadCommentsTotal > 99 ? '99+' : unreadCommentsTotal}
                </span>
                <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2.6} />
                <span className="text-left font-extrabold">{unreadCommentsLabel}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="rounded-full border-2 border-white/50 bg-white/25 p-3 text-white shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="fumo-page-sheet -mt-8 space-y-8 px-4 pb-4 pt-6">
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
                  src={resolvePublicAssetUrl(posterAvatar) ?? posterAvatar}
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
                  src={resolvePublicAssetUrl(moment.imageUrl) ?? moment.imageUrl}
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
                            src={resolvePublicAssetUrl(ch?.avatar) ?? ch?.avatar}
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
                {moment.imageUrl ? (
                  <button
                    type="button"
                    className="opacity-40 hover:opacity-100 p-1 rounded-lg hover:bg-cream-accent/20 transition-colors shrink-0"
                    title={
                      language === 'zh'
                        ? '下载图片'
                        : language === 'ja'
                          ? '画像を保存'
                          : 'Download image'
                    }
                    onClick={() =>
                      void downloadMomentImage(
                        moment.imageUrl!,
                        `fumo-moment-${moment.id.slice(0, 12)}`
                      )
                    }
                  >
                    <Download className="w-5 h-5" />
                  </button>
                ) : null}
              </div>

              {moment.comments.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  {moment.comments.map(c => renderComment(moment.id, c))}
                </div>
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
