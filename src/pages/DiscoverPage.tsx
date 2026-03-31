import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CHARACTERS,
  type Character,
  type Language,
  type Moment,
  type MomentComment,
  type UserProfile,
} from '@/types';
import { Heart, MessageCircle, Share2, Plus, Camera, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { buildEngagementForUserPost } from '@/data/momentNpcReplies';
import {
  createCharacterComment,
  createUserComment,
  createUserMoment,
  ensureSeedCharacterMoments,
  fetchMomentsFeed,
  setLike,
  subscribeMomentsRefresh,
} from '@/services/cloudStore';

function newCommentId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const MOCK_MOMENTS: Moment[] = [
  {
    id: '1',
    authorType: 'character',
    characterId: 'reimu',
    content: {
      zh: '今天神社也很清闲呢，要是有人来塞钱就好了...（瘫倒在垫子上）',
      ja: '今日も神社は暇ね。誰かお賽銭を入れに来てくれないかしら…（座布団に倒れ込む）',
      en: 'The shrine is quiet again today. I wish someone would come and donate... (*collapses on cushion*)',
    },
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    likes: 24,
    comments: [
      {
        id: 'm1-1',
        authorType: 'character',
        characterId: 'marisa',
        text: {
          zh: '我这就去！顺便借走你的茶叶DAZE！',
          ja: '今行くぜ！ついでにお茶っ葉を借りていくのぜ！',
          en: "I'm coming! And I'll borrow your tea leaves too DAZE!",
        },
      },
      {
        id: 'm1-2',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '神社的安静……适合看书。别指望我去塞钱。',
          ja: '神社の静けさ……読書には向くわ。お賽銭は期待しないで。',
          en: 'Quiet at the shrine... good for reading. Don’t expect a donation from me.',
        },
      },
      {
        id: 'm1-3',
        authorType: 'character',
        characterId: 'sanae',
        text: {
          zh: '灵梦小姐要不要来守矢看看？信仰也能换换口味哦～',
          ja: '霊夢さん、守矢に来てみる？信仰も気分転換になるよ～',
          en: 'Reimu, want to visit Moriya? A change of faith might be nice~',
        },
      },
      {
        id: 'm1-4',
        authorType: 'character',
        characterId: 'koishi',
        text: {
          zh: '我在你背后哦……骗你的。',
          ja: '後ろにいるよ……なんてね。',
          en: "I'm right behind you... just kidding.",
        },
      },
    ],
  },
  {
    id: '2',
    authorType: 'character',
    characterId: 'marisa',
    content: {
      zh: '在魔法之森发现了一颗亮晶晶的蘑菇！这一定是稀有材料DAZE！',
      ja: '魔法の森でキラキラしたキノコを見つけたぜ！これはきっとレアな素材だぜ！',
      en: 'Found a sparkly mushroom in the Forest of Magic! This must be a rare ingredient DAZE!',
    },
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    likes: 42,
    comments: [
      {
        id: 'm2-1',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '那种蘑菇多半有毒……别又把实验室炸了。',
          ja: 'そのキノコ、たぶん毒よ……またアトリエを爆発させないで。',
          en: 'That mushroom is probably poisonous... don’t blow up your lab again.',
        },
      },
      {
        id: 'm2-2',
        authorType: 'character',
        characterId: 'reimu',
        text: {
          zh: '别把奇怪的东西带回神社附近。',
          ja: '変なものを神社の近くに持ち込まないで。',
          en: 'Don’t bring weird stuff near the shrine.',
        },
      },
      {
        id: 'm2-3',
        authorType: 'character',
        characterId: 'suwako',
        text: {
          zh: '咯咯，采蘑菇的小魔法使～',
          ja: 'けろけろ、キノコ狩りの魔法使い～',
          en: 'Kero kero, mushroom-hunting magician~',
        },
      },
    ],
  },
  {
    id: '3',
    authorType: 'character',
    characterId: 'sakuya',
    content: {
      zh: '大小姐今天的下午茶是红茶和特制小蛋糕。时间停止的一瞬间，奶油的香气最浓郁。',
      ja: 'お嬢様の今日のお茶会は、紅茶と特製ケーキです。時を止めた瞬間、クリームの香りが一番引き立ちます。',
      en: "Mistress's afternoon tea today is black tea and special cupcakes. The aroma of cream is richest at the moment time stops.",
    },
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    likes: 56,
    comments: [
      {
        id: 'm3-1',
        authorType: 'character',
        characterId: 'remilia',
        text: {
          zh: '做得不错，咲夜。',
          ja: 'よくやったわ、咲夜。',
          en: 'Well done, Sakuya.',
        },
      },
      {
        id: 'm3-2',
        authorType: 'character',
        characterId: 'yuyuko',
        text: {
          zh: '我也想吃……咲夜偏心～',
          ja: '私も食べたい……咲夜のえこひいき～',
          en: 'I want some too... Sakuya plays favorites~',
        },
      },
      {
        id: 'm3-3',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '红魔馆的点心……书库里可闻不到。',
          ja: '紅魔館のお菓子……書庫には香ってこないわ。',
          en: 'Scarlet sweets... the library never smells like that.',
        },
      },
    ],
  },
];

const COMMENT_STAGGER_MS = 420;

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
  const reloadFeed = async () => {
    const { moments: next, likedMomentIds } = await fetchMomentsFeed(userId);
    setMoments(next);
    setLikedMoments(likedMomentIds);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureSeedCharacterMoments(MOCK_MOMENTS);
      if (!alive) return;
      await reloadFeed();
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

  const [commentVisible, setCommentVisible] = useState<Record<string, number>>({});
  const commentsSig = useMemo(
    () =>
      moments
        .map(m => `${m.id}:${m.comments.map(c => c.id).join(',')}`)
        .join('|'),
    [moments]
  );

  useEffect(() => {
    setCommentVisible({});
    const timers: ReturnType<typeof setTimeout>[] = [];
    moments.forEach(m => {
      m.comments.forEach((_, idx) => {
        timers.push(
          setTimeout(() => {
            setCommentVisible(prev => ({ ...prev, [m.id]: idx + 1 }));
          }, idx * COMMENT_STAGGER_MS)
        );
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [commentsSig]);

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
      userDisplayName: userProfile.displayName,
      userAvatarUrl: userProfile.avatarUrl,
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
    const engagement = buildEngagementForUserPost(characters, 5);
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
      comments: engagement.comments,
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
      await Promise.all(engagement.comments.map(c => createCharacterComment(created.id, c)));
    }
    await reloadFeed();
  };

  const renderComment = (comment: MomentComment) => {
    if (comment.authorType === 'user') {
      const name = comment.userDisplayName ?? userProfile.displayName;
      const avatar = comment.userAvatarUrl ?? userProfile.avatarUrl;
      return (
        <div
          key={comment.id}
          className="flex gap-2 text-xs bg-cream-accent/10 p-2 rounded-xl border border-cream-border border-dashed"
        >
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
        </div>
      );
    }
    const commenter = CHARACTERS.find(c => c.id === comment.characterId);
    return (
      <div
        key={comment.id}
        className="flex gap-2 text-xs bg-cream-accent/10 p-2 rounded-xl border border-cream-border border-dashed"
      >
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
            moment.authorType === 'user' ? userProfile.displayName : poster?.name[language];
          const posterAvatar =
            moment.authorType === 'user' ? userProfile.avatarUrl : poster?.avatar;
          const isLiked = likedMoments.has(moment.id);
          const unread = getMomentUnreadCharacterComments(moment) > 0;
          const currentCharacterComments =
            moment.authorType === 'user'
              ? moment.comments.filter(c => c.authorType === 'character').length
              : 0;
          const visibleN = commentVisible[moment.id] ?? 0;
          const shownComments = moment.comments.slice(0, visibleN);

          return (
            <div key={moment.id} className="stitched-card p-0 overflow-hidden relative">
              {unread && (
                <span
                  className="absolute top-3 right-3 z-10 min-w-[10px] h-[10px] rounded-full bg-[#FF4D4D] border-2 border-white fumo-shadow"
                  title={language === 'zh' ? '新互动' : language === 'ja' ? '新着' : 'New activity'}
                />
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

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleLike(moment.id)}
                    className={cn(
                      'flex items-center gap-1 transition-all active:scale-125',
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
                  <div className="flex items-center gap-1 opacity-60">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-bold">{moment.comments.length}</span>
                  </div>
                </div>
                <button type="button" className="opacity-40 hover:opacity-100">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {shownComments.length > 0 && (
                <div className="px-4 pb-4 space-y-2">{shownComments.map(renderComment)}</div>
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
