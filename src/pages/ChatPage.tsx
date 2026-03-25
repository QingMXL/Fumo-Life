import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Gift, MapPin, Send, Smile, Heart } from 'lucide-react';
import { type Language, type Message, type Character } from '@/types';
import { generateFumoResponse } from '@/services/gemini';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const CHAT_STORAGE_PREFIX = 'fumo-chat-';

function chatStorageKey(characterId: string, language: Language) {
  return `${CHAT_STORAGE_PREFIX}${characterId}:${language}`;
}

function loadStoredChat(characterId: string, language: Language): Message[] | null {
  try {
    const raw = localStorage.getItem(chatStorageKey(characterId, language));
    if (!raw) return null;
    const arr = JSON.parse(raw) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    return arr.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return null;
  }
}

function saveStoredChat(characterId: string, language: Language, msgs: Message[]) {
  localStorage.setItem(
    chatStorageKey(characterId, language),
    JSON.stringify(msgs.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })))
  );
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

interface ChatPageProps {
  language: Language;
  characters: Character[];
  onUpdateBond: (id: string, amount: number) => void;
  onMarkChatRead: (id: string) => void;
  onConversationMeta: (characterId: string, lastText: string, at: number) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  language,
  characters,
  onUpdateBond,
  onMarkChatRead,
  onConversationMeta,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fumo = characters.find(c => c.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const initialAnimCompleteRef = useRef(true);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.slice(0, revealCount);

  const syncRevealForAppend = (nextLen: number) => {
    queueMicrotask(() => {
      if (initialAnimCompleteRef.current) setRevealCount(nextLen);
    });
  };

  useEffect(() => {
    if (!fumo) return;
    onMarkChatRead(fumo.id);
    initialAnimCompleteRef.current = false;

    const stored = loadStoredChat(fumo.id, language);
    if (stored && stored.length > 0) {
      setMessages(stored);
      setRevealCount(stored.length);
      initialAnimCompleteRef.current = true;
      return;
    }

    const seeds = buildUnreadSeed(fumo, language);
    setMessages(seeds);
    setRevealCount(0);
    if (seeds.length === 0) {
      initialAnimCompleteRef.current = true;
      return;
    }

    let n = 0;
    const interval = window.setInterval(() => {
      n += 1;
      setRevealCount(Math.min(n, seeds.length));
      if (n >= seeds.length) {
        window.clearInterval(interval);
        initialAnimCompleteRef.current = true;
      }
    }, 520);
    return () => window.clearInterval(interval);
  }, [fumo?.id, language, onMarkChatRead]);

  useEffect(() => {
    if (!fumo?.id || messages.length === 0) return;
    saveStoredChat(fumo.id, language, messages);
  }, [messages, fumo?.id, language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, isTyping, revealCount]);

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
    const giftMsg: Message = {
      id: Date.now().toString(),
      characterId: fumo.id,
      sender: 'user',
      text: `${language === 'zh' ? '送出了' : language === 'ja' ? 'を贈りました' : 'Gave'} ${gift.icon} ${gift.name[language]}`,
      timestamp: new Date(),
    };
    const historyAfterGift = [...messages, giftMsg];
    setMessages(prev => {
      const next = [...prev, giftMsg];
      syncRevealForAppend(next.length);
      return next;
    });
    onConversationMeta(fumo.id, giftMsg.text, giftMsg.timestamp.getTime());
    setShowGifts(false);
    
    // Update bond level
    onUpdateBond(fumo.id, 1);
    
    // Simulate AI reaction
    setTimeout(async () => {
      setIsTyping(true);
      const reaction = await generateFumoResponse(fumo.id, historyAfterGift, `I gave you ${gift.name.en}.`, language);
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        characterId: fumo.id,
        sender: 'fumo',
        text: reaction,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const next = [...prev, reply];
        syncRevealForAppend(next.length);
        return next;
      });
      onConversationMeta(fumo.id, reply.text, reply.timestamp.getTime());
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
        id: Date.now().toString(),
        characterId: fumo.id,
        sender: 'user',
        text: '',
        timestamp: new Date(),
        imageUrl: url,
      };
      setMessages(prev => {
        const next = [...prev, msg];
        syncRevealForAppend(next.length);
        return next;
      });
      onConversationMeta(fumo.id, language === 'zh' ? '[图片]' : language === 'ja' ? '[画像]' : '[Photo]', msg.timestamp.getTime());
    };
    picker.click();
  };

  if (!fumo) return <div>Fumo not found</div>;

  const liveFumo = characters.find(c => c.id === fumo.id) ?? fumo;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      characterId: fumo.id,
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    const historyWithUser = [...messages, userMsg];
    setMessages(prev => {
      const next = [...prev, userMsg];
      syncRevealForAppend(next.length);
      return next;
    });
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
        
        const fumoMsg: Message = {
          id: (Date.now() + i + 1).toString(),
          characterId: fumo.id,
          sender: 'fumo',
          text: parts[i],
          timestamp: new Date(),
        };
        setMessages(prev => {
          const next = [...prev, fumoMsg];
          syncRevealForAppend(next.length);
          return next;
        });
        onConversationMeta(fumo.id, fumoMsg.text, fumoMsg.timestamp.getTime());
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
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A highly detailed 3D rendering of ${fumo.name[language]} (a Touhou Project Fumo plush doll) in a cute daily life scene in Gensokyo. Soft plush texture, visible velvet and wool fabrics, handcrafted quality, signature Fumo design with large head and short limbs, round black dot eyes, adorable and fluffy, photorealistic style, cute and comforting. Scene: ${fumo.id === 'reimu' ? 'at the Hakurei Shrine with a donation box' : fumo.id === 'marisa' ? 'in the Forest of Magic with mushrooms' : 'in the Scarlet Devil Mansion kitchen'}.`,
            },
          ],
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const fumoMsg: Message = {
          id: Date.now().toString(),
          characterId: fumo.id,
          sender: 'fumo',
          text: language === 'zh' ? '看！这是我刚才拍的照片捏~' : language === 'ja' ? '見て！さっき撮った写真だよ〜' : 'Look! Here is a photo I just took~',
          timestamp: new Date(),
          imageUrl,
        };
        setMessages(prev => {
          const next = [...prev, fumoMsg];
          syncRevealForAppend(next.length);
          return next;
        });
        onConversationMeta(fumo.id, fumoMsg.text, fumoMsg.timestamp.getTime());
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsTyping(false);
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
      </AnimatePresence>

      {/* Header */}
      <header className="bg-cream-card/80 backdrop-blur-md p-4 flex items-center gap-3 border-b-2 border-cream-border border-dashed z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-cream-accent/20 rounded-full transition-colors">
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
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-2 max-w-[85%]",
                msg.sender === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {msg.sender === 'fumo' && (
                <img src={fumo.avatar} className="w-8 h-8 rounded-full border-2 border-white self-end mb-1" alt="" />
              )}
              <div className={cn(
                "p-3 rounded-2xl stitched-border text-sm leading-relaxed",
                msg.sender === 'user' 
                  ? "bg-cream-accent/20 rounded-tr-none" 
                  : "bg-white rounded-tl-none"
              )}>
                {msg.text}
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Fumo Life" 
                    className="mt-2 rounded-xl border-2 border-cream-border border-dashed w-full"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <div className="flex gap-2 mr-auto">
            <img src={fumo.avatar} className="w-8 h-8 rounded-full border-2 border-white self-end mb-1" alt="" />
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
