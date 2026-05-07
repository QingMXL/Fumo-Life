import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Gift, MapPin, Send, Smile, Heart, MoreHorizontal } from 'lucide-react';
import { type Language, type Message, type Character } from '@/types';
import {
  generateFumoResponse,
  generateFumoSceneImage,
  shouldAttachAiImage,
} from '@/services/gemini';
import { loadChatMirror, mergeChatMirrorWithCloud, saveChatMirror } from '@/lib/chatLocalMirror';
import { fileOrBlobUrlToJpegDataUrl } from '@/lib/imageDataUrl';
import { cn, resolvePublicAssetUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  createCharacterMoment,
  deleteUserMessage,
  fetchMessages,
  insertMessage,
  subscribeMessages,
} from '@/services/cloudStore';

const CHAT_CLEARED_KEY_PREFIX = 'fumo-chat-cleared-at:';

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
  const mirrorSaveTimerRef = useRef<number | null>(null);
  /** 始终指向当前渲染的 messages，供卸载/切会话时立刻落盘镜像（避免仅依赖防抖被取消）。 */
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 有任意展示行即落盘，便于无云端历史时也能反复进入看到同一段开场/未读占位。 */
  const shouldPersistMirror = (msgs: Message[]) => msgs.length > 0;

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
    const FETCH_DEADLINE_MS = 25_000;
    const clearedAt = localStorage.getItem(`${CHAT_CLEARED_KEY_PREFIX}${userId}`);
    const localMirror = clearedAt ? [] : loadChatMirror(userId, fumo.id);
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
        console.error('fetchMessages failed, using mirror / seeded chat:', e);
      }
      if (!alive) return;
      const markHydrated = (batch: Message[]) => {
        const t = Date.now();
        setMessages(batch);
        setHydrateAt(t);
      };
      // 不在此处做相邻折叠：会误删合法连续消息；仅保留 merge 后的完整时间线。
      const merged = mergeChatMirrorWithCloud(cloud, localMirror);
      if (merged.length > 0) {
        markHydrated(merged);
        saveChatMirror(userId, fumo.id, merged);
        return;
      }
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
    if (!fumo) return;
    const uid = userId;
    const cid = fumo.id;
    const flushMirror = () => {
      const latest = messagesRef.current;
      if (!shouldPersistMirror(latest)) return;
      saveChatMirror(uid, cid, latest);
    };
    if (!shouldPersistMirror(messages)) return;
    if (mirrorSaveTimerRef.current != null) window.clearTimeout(mirrorSaveTimerRef.current);
    mirrorSaveTimerRef.current = window.setTimeout(flushMirror, 200);
    return () => {
      if (mirrorSaveTimerRef.current != null) window.clearTimeout(mirrorSaveTimerRef.current);
      flushMirror();
    };
  }, [messages, fumo?.id, userId]);

  useEffect(() => {
    if (!fumo) return;
    const uid = userId;
    const cid = fumo.id;
    const flush = () => {
      const latest = messagesRef.current;
      if (shouldPersistMirror(latest)) saveChatMirror(uid, cid, latest);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fumo?.id, userId]);

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
      void (async () => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return;
        let dataUrl: string;
        try {
          dataUrl = await fileOrBlobUrlToJpegDataUrl(file);
        } catch (err) {
          console.error(err);
          return;
        }
        const msg: Message = {
          id: `tmp-${Date.now()}`,
          characterId: fumo.id,
          sender: 'user',
          text: '',
          timestamp: new Date(),
          imageUrl: dataUrl,
        };
        setMessages(prev => [...prev, msg]);
        try {
          await insertMessage(userId, { characterId: fumo.id, sender: 'user', imageUrl: dataUrl, text: '' });
        } catch (err) {
          console.error(err);
        }
        onConversationMeta(fumo.id, language === 'zh' ? '[图片]' : language === 'ja' ? '[画像]' : '[Photo]', msg.timestamp.getTime());
      })();
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
    <div className="relative flex h-screen max-w-md mx-auto flex-col overflow-hidden bg-cream-bg">
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
                <img src={resolvePublicAssetUrl(fumo.avatar) ?? fumo.avatar} className="w-20 h-20 rounded-full border-4 border-white fumo-shadow" alt="" />
                <div>
                  <h3 className="font-bold text-xl">{fumo.name[language]}</h3>
                  <p className="text-xs opacity-60 mt-1">{fumo.description[language]}</p>
                </div>
                <div className="bond-bar-kawaii h-4">
                  <div className="bond-bar-kawaii-fill" style={{ width: `${(liveFumo.bondLevel / 10) * 100}%` }} />
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

      <div className="fumo-header-sky relative z-10 shrink-0 px-4 pb-7 pt-3">
        <div className="relative flex h-11 items-center justify-between">
          <button type="button" onClick={goMessages} className="kawaii-back-btn z-10 p-2 transition-transform active:scale-95">
            <ChevronLeft className="h-6 w-6" strokeWidth={2.35} />
          </button>
          <h1 className="fumo-title-app pointer-events-none absolute inset-x-0 text-center text-[0.95rem] font-black">
            Fumo² Life
          </h1>
          <span className="z-10 flex h-10 w-10 items-center justify-center text-lg select-none opacity-90" aria-hidden>
            🌸
          </span>
        </div>
      </div>

      <div className="fumo-page-sheet -mt-5 flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-cream-card/95">
        <div className="shrink-0 border-b border-dashed border-cream-border/55 bg-gradient-to-b from-white/90 to-cream-card/90 px-4 pb-4 pt-3">
          <div className="flex items-center gap-3">
            <img
              src={resolvePublicAssetUrl(fumo.avatar) ?? fumo.avatar}
              className="h-[4.25rem] w-[4.25rem] rounded-full border-[3px] border-white object-cover fumo-shadow"
              alt=""
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold leading-tight text-cream-text">{fumo.name[language]}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-cream-text/55">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    fumo.isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-cream-border'
                  )}
                />
                {fumo.isOnline
                  ? language === 'zh'
                    ? '在线'
                    : language === 'ja'
                      ? 'オンライン'
                      : 'Online'
                  : language === 'zh'
                    ? '离线'
                    : language === 'ja'
                      ? 'オフライン'
                      : 'Away'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="bond-bar-kawaii">
              <div className="bond-bar-kawaii-fill" style={{ width: `${(liveFumo.bondLevel / 10) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-center text-[10px] font-extrabold tracking-wide text-cream-text/50">
              {language === 'zh'
                ? `羁绊等级：${liveFumo.bondLevel} / 10`
                : language === 'ja'
                  ? `絆：${liveFumo.bondLevel} / 10`
                  : `Bond: ${liveFumo.bondLevel} / 10`}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="chat-wood-bg flex-1 space-y-4 overflow-y-auto p-4 pb-36">
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
                <img src={resolvePublicAssetUrl(fumo.avatar) ?? fumo.avatar} className="w-10 h-10 rounded-full border-2 border-white self-end mb-1 fumo-shadow object-cover" alt="" />
              )}
              <div
                className={cn('p-3', msg.sender === 'user' ? 'bubble-user-msg' : 'bubble-fumo-msg')}
              >
                {msg.text}
                {msg.imageUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(resolvePublicAssetUrl(msg.imageUrl) ?? msg.imageUrl, '_blank')}
                    className={cn(
                      "mt-2 block",
                      msg.sender === 'user' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    <img 
                      src={resolvePublicAssetUrl(msg.imageUrl) ?? msg.imageUrl} 
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
            <img src={resolvePublicAssetUrl(fumo.avatar) ?? fumo.avatar} className="w-10 h-10 rounded-full border-2 border-white self-end mb-1 fumo-shadow object-cover" alt="" />
            <div className="bubble-fumo-msg flex gap-1 p-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cream-text/35" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cream-text/35 [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cream-text/35 [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 max-w-md mx-auto bg-gradient-to-t from-fumo-nav-bar via-fumo-nav-bar/95 to-transparent px-3 pb-3 pt-6">
        <div className="stitched-card flex flex-col gap-2 border-cream-border/80 bg-white/92 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'zh' ? '输入你的消息...' : language === 'ja' ? 'メッセージを入力...' : 'Type a message...'}
                className="flex-1 border-none bg-transparent py-2 text-sm font-medium text-cream-text placeholder:text-cream-text/35 focus:ring-0"
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
                className="rounded-full bg-cream-text p-2 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="h-4 w-4" strokeWidth={2.35} />
              </button>
            </div>
          <div className="flex justify-around border-t border-dashed border-cream-border/70 pt-2">
            <button 
              onClick={handleCamera}
              className="flex flex-col items-center gap-1 text-cream-text/55 transition-opacity hover:opacity-100"
            >
              <Camera className="h-5 w-5" strokeWidth={2.25} />
              <span className="text-[9px] font-extrabold">{language === 'zh' ? '相机' : language === 'ja' ? 'カメラ' : 'Camera'}</span>
            </button>
            <button 
              onClick={() => setShowGifts(true)}
              className="flex flex-col items-center gap-1 text-cream-text/55 transition-opacity hover:opacity-100"
            >
              <Gift className="h-5 w-5" strokeWidth={2.25} />
              <span className="text-[9px] font-extrabold">{language === 'zh' ? '礼物' : language === 'ja' ? 'ギフト' : 'Gift'}</span>
            </button>
            <button 
              onClick={() => setShowExplore(true)}
              className="flex flex-col items-center gap-1 text-cream-text/55 transition-opacity hover:opacity-100"
            >
              <MapPin className="h-5 w-5" strokeWidth={2.25} />
              <span className="text-[9px] font-extrabold">{language === 'zh' ? '探索' : language === 'ja' ? '探索' : 'Explore'}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
