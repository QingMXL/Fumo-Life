import React, { useState } from 'react';
import { CHARACTERS, type Language, type Moment } from '@/types';
import { Heart, MessageCircle, Share2, Plus, Camera, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

const MOCK_MOMENTS: Moment[] = [
  {
    id: '1',
    characterId: 'reimu',
    content: {
      zh: '今天神社也很清闲呢，要是有人来塞钱就好了...（瘫倒在垫子上）',
      ja: '今日も神社は暇ね。誰かお賽銭を入れに来てくれないかしら…（座布団に倒れ込む）',
      en: 'The shrine is quiet again today. I wish someone would come and donate... (*collapses on cushion*)'
    },
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    likes: 24,
    comments: [
      { characterId: 'marisa', text: { zh: '我这就去！顺便借走你的茶叶DAZE！', ja: '今行くぜ！ついでにお茶っ葉を借りていくのぜ！', en: 'I\'m coming! And I\'ll borrow your tea leaves too DAZE!' } }
    ]
  },
  {
    id: '2',
    characterId: 'marisa',
    content: {
      zh: '在魔法之森发现了一颗亮晶晶的蘑菇！这一定是稀有材料DAZE！',
      ja: '魔法の森でキラキラしたキノコを見つけたぜ！これはきっとレアな素材だぜ！',
      en: 'Found a sparkly mushroom in the Forest of Magic! This must be a rare ingredient DAZE!'
    },
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    likes: 42,
    comments: [
      { characterId: 'alice', text: { zh: '那种蘑菇是有毒的吧...别又把实验室炸了。', ja: 'そのキノコ、毒があるんじゃないかしら…またアトリエを爆発させないでね。', en: 'That mushroom looks poisonous... don\'t blow up your lab again.' } }
    ]
  },
  {
    id: '3',
    characterId: 'sakuya',
    content: {
      zh: '大小姐今天的下午茶是红茶和特制小蛋糕。时间停止的一瞬间，奶油的香气最浓郁。',
      ja: 'お嬢様の今日のお茶会は、紅茶と特製ケーキです。時を止めた瞬間、クリームの香りが一番引き立ちます。',
      en: 'Mistress\'s afternoon tea today is black tea and special cupcakes. The aroma of cream is richest at the moment time stops.'
    },
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    likes: 56,
    comments: [
      { characterId: 'remilia', text: { zh: '做得不错，咲夜。', ja: 'よくやったわ、咲夜。', en: 'Well done, Sakuya.' } },
      { characterId: 'flandre', text: { zh: '我也要吃！我也要吃！', ja: '私も食べる！私も食べる！', en: 'I want some too! I want some too!' } }
    ]
  }
];

interface DiscoverPageProps {
  language: Language;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ language }) => {
  const [moments, setMoments] = useState(MOCK_MOMENTS);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [likedMoments, setLikedMoments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});

  const handleLike = (id: string) => {
    setLikedMoments(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setMoments(m => m.map(item => item.id === id ? { ...item, likes: item.likes - 1 } : item));
      } else {
        next.add(id);
        setMoments(m => m.map(item => item.id === id ? { ...item, likes: item.likes + 1 } : item));
      }
      return next;
    });
  };

  const handleCommentSubmit = (momentId: string) => {
    const text = commentInputs[momentId];
    if (!text?.trim()) return;

    setMoments(prev => prev.map(m => {
      if (m.id === momentId) {
        return {
          ...m,
          comments: [
            ...m.comments,
            { characterId: 'reimu', text: { zh: text, ja: text, en: text } }
          ]
        };
      }
      return m;
    }));
    setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
  };

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    const newMoment: Moment = {
      id: Date.now().toString(),
      characterId: 'reimu', // Simulate as user (using Reimu as placeholder)
      content: { zh: newPostContent, ja: newPostContent, en: newPostContent },
      imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800',
      timestamp: new Date(),
      likes: 0,
      comments: []
    };
    setMoments([newMoment, ...moments]);
    setNewPostContent('');
    setShowPostModal(false);
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
          onClick={() => setShowPostModal(true)}
          className="bg-cream-text text-white p-3 rounded-full fumo-shadow hover:scale-110 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="space-y-8">
        {moments.map((moment) => {
          const fumo = CHARACTERS.find(c => c.id === moment.characterId);
          const isLiked = likedMoments.has(moment.id);
          return (
            <div key={moment.id} className="stitched-card p-0 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <img src={fumo?.avatar} className="w-10 h-10 rounded-full border-2 border-white fumo-shadow" alt="" />
                <div>
                  <h3 className="font-bold text-sm">{fumo?.name[language]}</h3>
                  <span className="text-[10px] opacity-40">{formatDistanceToNow(moment.timestamp)} ago</span>
                </div>
              </div>
              
              <div className="px-4 pb-3">
                <p className="text-sm leading-relaxed">{moment.content[language]}</p>
              </div>

              <img 
                src={moment.imageUrl} 
                className="w-full h-64 object-cover border-y-2 border-cream-border border-dashed" 
                alt="Moment"
                referrerPolicy="no-referrer"
              />

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(moment.id)}
                    className={cn(
                      "flex items-center gap-1 transition-all active:scale-125",
                      isLiked ? "opacity-100" : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", isLiked ? "text-red-500 fill-red-500" : "text-red-400")} />
                    <span className="text-xs font-bold">{moment.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-bold">{moment.comments.length}</span>
                  </button>
                </div>
                <button className="opacity-40 hover:opacity-100">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {moment.comments.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  {moment.comments.map((comment, idx) => {
                    const commenter = CHARACTERS.find(c => c.id === comment.characterId);
                    return (
                      <div key={idx} className="text-xs bg-cream-accent/10 p-2 rounded-xl border border-cream-border border-dashed">
                        <span className="font-bold mr-2">{commenter?.name[language]}:</span>
                        <span className="opacity-70">{comment.text[language]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="px-4 pb-4 flex gap-2">
                <input 
                  type="text" 
                  value={commentInputs[moment.id] || ''}
                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [moment.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(moment.id)}
                  placeholder={language === 'zh' ? '发表评论...' : language === 'ja' ? 'コメントを書く...' : 'Add a comment...'}
                  className="flex-1 bg-cream-accent/10 rounded-full px-4 py-2 text-xs border border-cream-border border-dashed focus:outline-none"
                />
                <button 
                  onClick={() => handleCommentSubmit(moment.id)}
                  className="text-xs font-bold text-cream-text opacity-60 hover:opacity-100 transition-opacity"
                >
                  {language === 'zh' ? '发送' : '送信'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowPostModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-cream-card rounded-3xl p-6 stitched-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg">{language === 'zh' ? '发布动态' : '投稿する'}</h3>
                <button onClick={() => setShowPostModal(false)} className="p-2 bg-cream-accent/20 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <textarea 
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder={language === 'zh' ? '分享你的 Fumo 生活...' : 'Fumoライフをシェアしましょう...'}
                className="w-full h-32 bg-white stitched-border rounded-2xl p-4 text-sm focus:outline-none resize-none mb-4"
              />
              
              <div className="flex gap-4 mb-6">
                <button className="flex-1 aspect-square bg-cream-accent/10 rounded-2xl stitched-border border-dashed flex flex-col items-center justify-center gap-2 opacity-60">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase">Add Photo</span>
                </button>
                <div className="flex-1" />
              </div>

              <button 
                onClick={handlePost}
                className="w-full bg-cream-text text-white py-3 rounded-full font-bold fumo-shadow hover:scale-105 active:scale-95 transition-transform"
              >
                {language === 'zh' ? '发布' : '投稿'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
