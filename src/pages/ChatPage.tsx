import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Gift, MapPin, Send, Smile, Heart, MoreHorizontal } from 'lucide-react';
import { type Language, type Message, type Character } from '@/types';
import {
  generateFumoResponse,
  generateFumoSceneImage,
  shouldAttachAiImage,
} from '@/services/gemini';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  createCharacterMoment,
  deleteUserMessage,
  fetchMessages,
  insertMessage,
  subscribeMessages,
} from '@/services/cloudStore';

const CHAT_CLEARED_KEY_PREFIX = 'fumo-chat-cleared-at:';

function normalizeChat(msgs: Message[]) {
  // Collapse adjacent identical fumo texts (fixes old cached spam / ABAB loops).
  const out: Message[] = [];
  for (const m of msgs) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.sender === 'fumo' &&
      m.sender === 'fumo' &&
      prev.text.trim() === m.text.trim() &&
      prev.imageUrl === m.imageUrl
    ) {
      continue;
    }
    out.push(m);
  }
  return out;
}

/** Staggered unread bubbles when opening a thread with no local history. */
function buildUnreadSeed(fumo: Character, lang: Language): Message[] {
  const n = Math.min(Math.max(fumo.unreadCount, 0), 5);
  if (n === 0) return [];
  const filler =
    lang === 'zh'
      ? '……刚才想找你，你不在呢。'
      : lang === 'ja'
        ? '……さっき声をかけたのに、いなかったわ。'
        : '...Looked for you earlier—you weren’t around.';
  const out: Message[] = [];
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    out.push({
      id: `unread-${fumo.id}-${i}`,
      characterId: fumo.id,
      sender: 'fumo',
      text: last ? (fumo.lastMessage?.[lang] ?? filler) : filler,
      timestamp: new Date(Date.now() - (n - 1 - i) * 70_000),
    });
  }
  return out;
}

/** 当云端暂无历史且未读为 0 时，提供一条开场消息，避免页面空白。 */
function buildStarterMessage(fumo: Character, lang: Language): Message {
  const text =
    fumo.lastMessage?.[lang] ??
    (lang === 'zh'
      ? '……在吗？今天过得怎么样。'
      : lang === 'ja'
        ? '……いる？今日はどうだった？'
        : '...You there? How was your day?');
  return {
    id: `starter-${fumo.id}`,
    characterId: fumo.id,
    sender: 'fumo',
    text,
    // 视为“历史开场白”，避免被当作新消息播动画
    timestamp: new Date(Date.now() - 120_000),
  };
}

interface ChatPageProps {
  language: Language;
  characters: Character[];
  userId: string;
  onUpdateBond: (id: string, amount: number) => void;
  onMarkChatRead: (id: string) => void;
  onConversationMeta: (characterId: string, lastText: string, at: number) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  language,
  characters,
  userId,
  onUpdateBond,
  onMarkChatRead,
  onConversationMeta,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goMessages = () => {
    console.log('[NAV][Chat] click back', { from: window.location.pathname, ts: Date.now() });
    navigate('/');
    console.log('[NAV][Chat] navigate("/")', { now: window.location.pathname });
    // 兜底：若路由未切换，直接浏览器跳转
    window.setTimeout(() => {
      console.log('[NAV][Chat] 120ms back check', { current: window.location.pathname });
      if (window.location.pathname !== '/') {
        console.warn('[NAV][Chat] fallback location.assign("/")');
        window.location.assign('/');
      }
    }, 120);
  };

  const fumo = characters.find(c => c.id === id);
  useEffect(() => {
    console.log('[NAV][Chat] mounted', { id, path: window.location.pathname, ts: Date.now() });
  }, [id]);
  const [messages, setMessages] = useState<Message[]>([]);
  /**  hydration 时间：在此之前加载的历史消息不播入场动画；仅之后产生的新消息播放。 */
  const [hydrateAt, setHydrateAt] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [menuMessage, setMenuMessage] = useState<Message | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageEnterAnimate = (msg: Message) =>
    hydrateAt != null &&
    !msg.skipEntryAnimation &&
    msg.timestamp.getTime() > hydrateAt;

  useEffect(() => {
    if (!fumo) return;
    setMessages([]);
    setHydrateAt(null);
    onMarkChatRead(fumo.id);
    let alive = true;
    const FETCH_DEADLINE_MS = 10_000;
    (async () => {
      let cloud: Message[] = [];
      try {
        cloud = await Promise.race([
          fetchMessages(userId, fumo.id),
          new Promise<Message[]>((_, reject) => {
            window.setTimeout(() => reject(new Error('fetchMessages timeout')), FETCH_DEADLINE_MS);
          }),
        ]);
      } catch (e) {
        console.error('fetchMessages failed, fallback to seeded chat:', e);
      }
      if (!alive) return;
      const markHydrated = (batch: Message[]) => {
        const t = Date.now();
        setMessages(batch);
        setHydrateAt(t);
      };
      if (cloud.length > 0) {
        markHydrated(normalizeChat(cloud));
        return;
      }
      // 用户手动“清空聊天内容”后，无历史时保持空白，等待新消息。
      const clearedAt = localStorage.getItem(`${CHAT_CLEARED_KEY_PREFIX}${userId}`);
      if (clearedAt) {
        markHydrated([]);
        return;
      }
      const seeds = buildUnreadSeed(fumo, language);
      if (seeds.length === 0) {
        markHydrated([buildStarterMessage(fumo, language)]);
        return;
      }
      markHydrated(seeds);
    })();

    const unsub = subscribeMessages(userId, fumo.id, m => {
      setMessages(prev => {
        if (prev.some(it => it.id === m.id)) return prev;
        const idx = prev.findIndex(
          it =>
            it.id.startsWith('tmp-') &&
            it.sender === m.sender &&
            (it.text ?? '') === (m.text ?? '') &&
            (it.imageUrl ?? '') === (m.imageUrl ?? '') &&
            Math.abs(it.timestamp.getTime() - m.timestamp.getTime()) < 5000
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...m, skipEntryAnimation: true };
          return next;
        }
        return [...prev, m];
      });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [fumo?.id, language, onMarkChatRead, userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const [showGifts, setShowGifts] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showKaomoji, setShowKaomoji] = useState(false);

  const kaomojis = [
    '(ᗜˬᗜ)', '(ᗜˬᗜ)✧', '(ᗜˬᗜ)b', '(ᗜˬᗜ)zZ',
    '(ᗜˬᗜ)？', '(ᗜˬᗜ)！', '(ᗜˬᗜ)っ', '(ᗜˬᗜ)っ🍵',
    '(ᗜˬᗜ)っ💰', '(ᗜˬᗜ)っ🍶', '(ᗜˬᗜ)っ🍄', '(ᗜˬᗜ)っ🍡'
  ];

  const handleKaomoji = (k: string) => {
    setInput(prev => prev + k);
    setShowKaomoji(false);
  };

  const gifts = [
    { id: 'sake', name: { zh: '清酒', ja: '清酒', en: 'Sake' }, icon: '🍶' },
    { id: 'tea', name: { zh: '茶叶', ja: '茶葉', en: 'Tea' }, icon: '🍵' },
    { id: 'money', name: { zh: '赛钱', ja: 'お賽銭', en: 'Donation' }, icon: '💰' },
    { id: 'mushroom', name: { zh: '蘑菇', ja: 'キノコ', en: 'Mushroom' }, icon: '🍄' },
  ];

  const handleGift = (gift: { id: string; name: Record<Language, string>; icon: string }) => {
    if (!fumo) return;
    const giftText = `${language === 'zh' ? '送出了' : language === 'ja' ? 'を贈りました' : 'Gave'} ${gift.icon} ${gift.name[language]}`;
    const giftMsg: Message = {
      id: `tmp-${Date.now()}`,
      characterId: fumo.id,
      sender: 'user',
      text: giftText,
      timestamp: new Date(),
    };
    const historyAfterGift = [...messages, giftMsg];
    setMessages(prev => [...prev, giftMsg]);
    void insertMessage(userId, { characterId: fumo.id, sender: 'user', text: giftText });
    onConversationMeta(fumo.id, giftText, Date.now());
    setShowGifts(false);
    
    // Update bond level
    onUpdateBond(fumo.id, 1);
    
    // Simulate AI reaction
    setTimeout(async () => {
      setIsTyping(true);
      const reaction = await generateFumoResponse(fumo.id, historyAfterGift, `I gave you ${gift.name.en}.`, language);
      let reactionImage: string | undefined;
      if (shouldAttachAiImage()) {
        const img = await generateFumoSceneImage(fumo.id, language, reaction);
        if (img) reactionImage = img;
      }
      const reply: Message = {
        id: `tmp-${Date.now() + 1}`,
        characterId: fumo.id,
        sender: 'fumo',
        text: reaction,
        timestamp: new Date(),
        imageUrl: reactionImage,
      };
      setMessages(prev => [...prev, reply]);
      void insertMessage(userId, {
        characterId: fumo.id,
        sender: 'fumo',
        text: reaction,
        imageUrl: reactionImage,
      });
      if (reactionImage) {
        void createCharacterMoment(fumo.id, {
          content: { zh: reaction, ja: reaction, en: reaction },
          imageUrl: reactionImage,
        });
      }
      onConversationMeta(fumo.id, reactionImage ? `${reply.text} [Photo]` : reply.text, reply.timestamp.getTime());
      setIsTyping(false);
    }, 1000);
  };

  const handleCamera = () => {
    if (!fumo) return;
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    // On mobile, this typically offers camera / recent photos.
    (picker as any).capture = 'environment';
    picker.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const msg: Message = {
        id: `tmp-${Date.now()}`,
        characterId: fumo.id,
        sender: 'user',
        text: '',
        timestamp: new Date(),
        imageUrl: url,
      };
      setMessages(prev => [...prev, msg]);
      void insertMessage(userId, { characterId: fumo.id, sender: 'user', imageUrl: url, text: '' });
      onConversationMeta(fumo.id, language === 'zh' ? '[图片]' : language === 'ja' ? '[画像]' : '[Photo]', msg.timestamp.getTime());
    };
    picker.click();
  };

  if (!fumo) return <div>Fumo not found</div>;

  const liveFumo = characters.find(c => c.id === fumo.id) ?? fumo;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      characterId: fumo.id,
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    const historyWithUser = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    void insertMessage(userId, { characterId: fumo.id, sender: 'user', text: input });
    onConversationMeta(fumo.id, userMsg.text, userMsg.timestamp.getTime());
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await generateFumoResponse(fumo.id, historyWithUser, input, language);
      
      // Split response by "---" to simulate multiple messages
      const parts = responseText.split('---').map(p => p.trim()).filter(p => p.length > 0);
      
      for (let i = 0; i < parts.length; i++) {
        // Add a small delay between split messages
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 800));
        
        let partImage: string | undefined;
        if (i === 0 && shouldAttachAiImage()) {
          const img = await generateFumoSceneImage(fumo.id, language, parts[i]);
          if (img) partImage = img;
        }
        const fumoMsg: Message = {
          id: `tmp-${Date.now() + i + 1}`,
          characterId: fumo.id,
          sender: 'fumo',
          text: parts[i],
          timestamp: new Date(),
          imageUrl: partImage,
        };
        setMessages(prev => [...prev, fumoMsg]);
        void insertMessage(userId, {
          characterId: fumo.id,
          sender: 'fumo',
          text: parts[i],
          imageUrl: partImage,
        });
        if (partImage) {
          void createCharacterMoment(fumo.id, {
            content: { zh: parts[i], ja: parts[i], en: parts[i] },
            imageUrl: partImage,
          });
        }
        onConversationMeta(
          fumo.id,
          partImage ? `${fumoMsg.text} [Photo]` : fumoMsg.text,
          fumoMsg.timestamp.getTime()
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsTyping(true);
    try {
      const sceneText =
        language === 'zh'
          ? `${fumo.name[language]}今天在幻想乡随手拍的一张治愈小场景。`
          : language === 'ja'
            ? `${fumo.name[language]}が幻想郷で撮った癒しのワンシーン。`
            : `A cozy healing snapshot ${fumo.name[language]} took in Gensokyo.`;
      const imageUrl = await generateFumoSceneImage(fumo.id, language, sceneText);

      if (imageUrl) {
        const fumoMsg: Message = {
          id: `tmp-${Date.now()}`,
          characterId: fumo.id,
          sender: 'fumo',
          text: language === 'zh' ? '看！这是我刚才拍的照片捏~' : language === 'ja' ? '見て！さっき撮った写真だよ〜' : 'Look! Here is a photo I just took~',
          timestamp: new Date(),
          imageUrl,
        };
        setMessages(prev => [...prev, fumoMsg]);
        void insertMessage(userId, {
          characterId: fumo.id,
          sender: 'fumo',
          text: fumoMsg.text,
          imageUrl: imageUrl,
        });
        void createCharacterMoment(fumo.id, {
          content: { zh: fumoMsg.text, ja: fumoMsg.text, en: fumoMsg.text },
          imageUrl,
        });
        onConversationMeta(fumo.id, fumoMsg.text, fumoMsg.timestamp.getTime());
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openUserMessageMenu = (msg: Message) => {
    if (msg.sender !== 'user') return;
    setMenuMessage(msg);
  };

  const handleUserMessageAction = async (mode: 'recall' | 'delete') => {
    if (!fumo || !menuMessage || menuMessage.sender !== 'user') return;
    const target = menuMessage;
    setMenuMessage(null);
    setMessages(prev => prev.filter(m => m.id !== target.id));
    try {
      await deleteUserMessage(userId, target.id, fumo.id);
    } catch (e) {
      // 若云端删除失败，回滚可见性，避免前后端状态不一致
      setMessages(prev => {
        if (prev.some(m => m.id === target.id)) return prev;
        return [...prev, target].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      console.error(`${mode} message failed`, e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-cream-bg max-w-md mx-auto relative overflow-hidden">
      {/* Modals */}
      <AnimatePresence>
        {showGifts && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowGifts(false)}
          >
            <motion.div 
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="w-full bg-cream-card rounded-t-3xl p-6 stitched-border border-b-0"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold mb-4 text-center">{language === 'zh' ? '选择礼物' : 'ギフトを選択'}</h3>
              <div className="grid grid-cols-4 gap-2">
                {gifts.map(g => (
                  <button 
                    key={g.id} 
                    onClick={() => handleGift(g)}
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl stitched-border hover:bg-cream-accent/10 transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <span className="text-[10px] font-bold text-center">{g.name[language]}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowGifts(false)}
                className="w-full py-2 rounded-full font-bold opacity-40 hover:opacity-100 transition-opacity text-xs mt-6"
              >
                {language === 'zh' ? '取消' : 'キャンセル'}
              </button>
            </motion.div>
          </motion.div>
        )}

        {showExplore && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowExplore(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-xs bg-cream-card rounded-3xl p-6 stitched-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <img src={fumo.avatar} className="w-20 h-20 rounded-full border-4 border-white fumo-shadow" alt="" />
                <div>
                  <h3 className="font-bold text-xl">{fumo.name[language]}</h3>
                  <p className="text-xs opacity-60 mt-1">{fumo.description[language]}</p>
                </div>
                <div className="w-full bg-cream-accent/20 h-4 rounded-full overflow-hidden stitched-border border-dashed">
                  <div 
                    className="h-full bg-cream-text transition-all duration-1000" 
                    style={{ width: `${(liveFumo.bondLevel / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black">BOND LEVEL: {liveFumo.bondLevel} / 10</span>
                
                <div className="w-full flex flex-col gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      onUpdateBond(fumo.id, 1);
                      setShowExplore(false);
                    }}
                    className="w-full bg-cream-text text-white py-3 rounded-full font-bold fumo-shadow flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    {language === 'zh' ? '摸摸头' : language === 'ja' ? 'なでなで' : 'Pat Head'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowExplore(false)}
                    className="w-full py-2 rounded-full font-bold opacity-40 hover:opacity-100 transition-opacity text-xs"
                  >
                    {language === 'zh' ? '返回' : '戻る'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {menuMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setMenuMessage(null)}
          >
            <motion.div
              initial={{ y: 260 }}
              animate={{ y: 0 }}
              exit={{ y: 260 }}
              className="w-full bg-cream-card rounded-t-3xl p-5 stitched-border border-b-0"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-xs font-bold opacity-50 mb-3">
                {language === 'zh' ? '消息操作' : language === 'ja' ? 'メッセージ操作' : 'Message Actions'}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleUserMessageAction('recall')}
                  className="w-full p-3 rounded-2xl bg-white stitched-border text-sm font-bold hover:bg-cream-accent/10 transition-colors"
                >
                  {language === 'zh' ? '撤回消息' : language === 'ja' ? '送信取り消し' : 'Recall Message'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleUserMessageAction('delete')}
                  className="w-full p-3 rounded-2xl bg-rose-50 text-rose-600 stitched-border text-sm font-bold hover:bg-rose-100 transition-colors"
                >
                  {language === 'zh' ? '删除消息' : language === 'ja' ? 'メッセージ削除' : 'Delete Message'}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuMessage(null)}
                  className="w-full p-2 text-xs font-bold opacity-50 hover:opacity-100"
                >
                  {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-cream-card/80 backdrop-blur-md p-4 flex items-center gap-3 border-b-2 border-cream-border border-dashed z-10">
        <button onClick={goMessages} className="p-2 hover:bg-cream-accent/20 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <img src={fumo.avatar} className="w-10 h-10 rounded-full border-2 border-white fumo-shadow" alt="" />
          <div>
            <h2 className="font-bold leading-tight">{fumo.name[language]}</h2>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-[10px] opacity-60 font-bold">Bond Level: {liveFumo.bondLevel} / 10</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={
                messageEnterAnimate(msg) ? { opacity: 0, y: 10, scale: 0.95 } : false
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-2 max-w-[85%]",
                msg.sender === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
              onTouchStart={() => {
                if (msg.sender !== 'user') return;
                clearLongPress();
                longPressTimerRef.current = window.setTimeout(() => openUserMessageMenu(msg), 420);
              }}
              onTouchEnd={clearLongPress}
              onTouchCancel={clearLongPress}
            >
              {msg.sender === 'fumo' && (
                <img src={fumo.avatar} className="w-10 h-10 rounded-full border-2 border-white self-end mb-1 fumo-shadow object-cover" alt="" />
              )}
              <div className={cn(
                "p-3 rounded-2xl stitched-border text-sm leading-relaxed",
                msg.sender === 'user' 
                  ? "bg-cream-accent/20 rounded-tr-none" 
                  : "bg-white rounded-tl-none"
              )}>
                {msg.text}
                {msg.imageUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(msg.imageUrl, '_blank')}
                    className={cn(
                      "mt-2 block",
                      msg.sender === 'user' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    <img 
                      src={msg.imageUrl} 
                      alt="Fumo Life" 
                      className="rounded-xl border-2 border-cream-border border-dashed w-[220px] max-w-[65vw] h-auto object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                )}
              </div>
              {msg.sender === 'user' && (
                <button
                  type="button"
                  onClick={() => openUserMessageMenu(msg)}
                  className="self-end mb-1 p-1 opacity-40 hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <div className="flex gap-2 mr-auto">
            <img src={fumo.avatar} className="w-10 h-10 rounded-full border-2 border-white self-end mb-1 fumo-shadow object-cover" alt="" />
            <div className="bg-white p-3 rounded-2xl rounded-tl-none stitched-border flex gap-1">
              <span className="w-1.5 h-1.5 bg-cream-accent rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-cream-accent rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-cream-accent rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream-bg via-cream-bg to-transparent">
        <div className="stitched-card bg-white/90 backdrop-blur-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'zh' ? '输入你的消息...' : language === 'ja' ? 'メッセージを入力...' : 'Type a message...'}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
              />
              <div className="relative">
                <button 
                  onClick={() => setShowKaomoji(!showKaomoji)}
                  className={cn("p-1 transition-opacity", showKaomoji ? "opacity-100 text-cream-text" : "opacity-40 hover:opacity-100")}
                >
                  <Smile className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showKaomoji && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-2xl stitched-border fumo-shadow grid grid-cols-3 gap-1 w-48 z-50"
                    >
                      {kaomojis.map(k => (
                        <button 
                          key={k} 
                          onClick={() => handleKaomoji(k)}
                          className="text-xs p-1.5 hover:bg-cream-accent/20 rounded-lg transition-colors font-mono"
                        >
                          {k}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button 
                onClick={handleSend}
                className="bg-cream-text text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-transform"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          <div className="flex justify-around pt-2 border-t border-cream-border border-dashed">
            <button 
              onClick={handleCamera}
              className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase">{language === 'zh' ? '相机' : language === 'ja' ? 'カメラ' : 'Camera'}</span>
            </button>
            <button 
              onClick={() => setShowGifts(true)}
              className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100"
            >
              <Gift className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase">{language === 'zh' ? '礼物' : language === 'ja' ? 'ギフト' : 'Gift'}</span>
            </button>
            <button 
              onClick={() => setShowExplore(true)}
              className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100"
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase">{language === 'zh' ? '探索' : language === 'ja' ? '探索' : 'Explore'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
