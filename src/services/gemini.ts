import { GoogleGenAI } from "@google/genai";
import { CHARACTERS, type Character, type Language, type Message, type MomentComment } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const NANO_BANANA_ENDPOINT = import.meta.env.VITE_NANO_BANANA_ENDPOINT as string | undefined;
const NANO_BANANA_API_KEY = import.meta.env.VITE_NANO_BANANA_API_KEY as string | undefined;

function laneText(language: Language, zh: string, ja: string, en: string) {
  return language === 'zh' ? zh : language === 'ja' ? ja : en;
}

function loadRecent(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecent(key: string, value: string, max = 24) {
  const prev = loadRecent(key);
  const next = [...prev.filter(v => v !== value), value].slice(-max);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function normalizeSig(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

const CHARACTER_STYLE: Record<string, string> = {
  reimu: 'Reimu: shrine maiden, lazy but sharp, short lines, light sarcasm, practical tone.',
  marisa: 'Marisa: bright, energetic, casual, playful confidence, occasional DAZE-style rhythm.',
  sakuya: 'Sakuya: elegant, precise, polite, composed and efficient.',
  patchouli: 'Patchouli: quiet, knowledgeable, concise, slightly dry humor.',
  remilia: 'Remilia: noble, confident, tsundere edge, short commanding lines.',
  yuyuko: 'Yuyuko: graceful, airy, playful appetite jokes, gentle teasing.',
  youmu: 'Youmu: earnest, diligent, straightforward, disciplined.',
  kaguya: 'Kaguya: regal, calm, slightly aloof, subtle wit.',
  tewi: 'Tewi: mischievous, lucky-trickster, playful short quips.',
  reisen: 'Reisen: serious, responsible, a bit flustered, practical.',
  sanae: 'Sanae: upbeat, friendly, modern phrasing but in-lore.',
  suwako: 'Suwako: ancient yet playful, earthy humor, lively short lines.',
  koishi: 'Koishi: whimsical, unpredictable, soft uncanny but friendly.',
};

function styleFor(characterId: string) {
  return CHARACTER_STYLE[characterId] ?? 'In-character Touhou roleplay, concise and natural daily chat.';
}

export async function generateFumoResponse(
  characterId: string,
  history: Message[],
  userInput: string,
  language: Language
) {
  const character = CHARACTERS.find(c => c.id === characterId);
  if (!character) throw new Error("Character not found");

  const crossRecent = loadRecent(`fumo-ai-recent:reply:cross:${language}`).slice(-20);
  const crossBlock =
    crossRecent.length > 0
      ? crossRecent.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : '(none)';

  const systemInstruction = `
[IDENTITY]
You are ${character.name[language]} from Touhou Project, strict in-lore roleplay.

[HARD RULES]
- Absolutely no OOC, no meta, no AI mention.
- Never say you are a plush/Fumo/doll/toy/cotton body.
- Do not describe yourself in third-person stage directions.
- Keep daily chat short and spoken, not literary.
- Language must be ONLY ${language}.
- Avoid repeating recent wording/phrases.
- Do NOT copy or lightly paraphrase lines recently used by ANY other character (list below).

[CROSS-CHARACTER NO-REUSE]
${crossBlock}

[STYLE]
${styleFor(characterId)}

[CONTENT]
- Topic should feel like real Gensokyo daily life.
- Healing, warm, natural social tone.
- 1-3 short lines. If splitting, use "---".
`;

  const chat = genAI.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    },
    history: history.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
  });

  const result = await chat.sendMessage({ message: userInput });
  const text = (result.text || '').trim();
  const sig = normalizeSig(text);
  saveRecent(`fumo-ai-recent:reply:${characterId}:${language}`, sig);
  saveRecent(`fumo-ai-recent:reply:cross:${language}`, sig);
  return text;
}

export async function generateCharacterProactiveText(
  characterId: string,
  language: Language,
  kind: 'chat' | 'moment'
): Promise<string> {
  const character = CHARACTERS.find(c => c.id === characterId);
  if (!character) throw new Error('Character not found');

  const recent = loadRecent(`fumo-ai-recent:${kind}:${characterId}:${language}`).slice(-8);
  const recentBlock = recent.length > 0 ? recent.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(none)';
  const crossKey = `fumo-ai-recent:${kind}:cross:${language}`;
  const crossRecent = loadRecent(crossKey).slice(-28);
  const crossBlock = crossRecent.length > 0 ? crossRecent.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(none)';
  const task = kind === 'moment'
    ? laneText(
        language,
        '请生成一条角色朋友圈动态文案（30-70字），自然、治愈、符合幻想乡日常。',
        'キャラのモーメンツ投稿文を1本生成（30-70字）。幻想郷の日常で自然かつ癒し系に。',
        'Generate one in-character Moments post (30-70 chars), cozy and daily-life in Gensokyo.'
      )
    : laneText(
        language,
        '请生成角色主动发来的聊天消息（1-2句）。',
        'キャラからの能動チャットを1-2文で生成。',
        'Generate a proactive chat message from the character in 1-2 short sentences.'
      );

  const systemInstruction = `
You are ${character.name[language]} from Touhou Project, strict in-lore.
- Never OOC/meta/AI.
- Never mention plush/Fumo/doll identity in speech.
- Use ONLY ${language}.
- Output natural colloquial short sentences.
- Keep daily-life and healing tone in Gensokyo.
- Style: ${styleFor(characterId)}
- Hard anti-repeat against list below.
- Do NOT reuse or paraphrase anything in the ALL-CHARACTERS list (other roles may have said it).
This character's recent:
${recentBlock}
All characters' recent (avoid sounding like any of these):
${crossBlock}
Output plain text only.
`;

  const out = await genAI.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction },
    contents: [{ role: 'user', parts: [{ text: task }] }],
  });

  const text = (out.text || '').trim();
  const sig = normalizeSig(text);
  if (recent.includes(sig) || crossRecent.includes(sig)) {
    const retry = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: `${systemInstruction}\nRetry with a different angle.` },
      contents: [{ role: 'user', parts: [{ text: task }] }],
    });
    const text2 = (retry.text || text).trim();
    const sig2 = normalizeSig(text2);
    saveRecent(`fumo-ai-recent:${kind}:${characterId}:${language}`, sig2);
    saveRecent(crossKey, sig2);
    return text2;
  }
  saveRecent(`fumo-ai-recent:${kind}:${characterId}:${language}`, sig);
  saveRecent(crossKey, sig);
  return text;
}

export function clearAllAiRecentCaches() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('fumo-ai-recent')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function shouldAttachAiImage() {
  // 每条消息使用 30%-50% 的随机阈值。
  const threshold = 0.3 + Math.random() * 0.2;
  return Math.random() < threshold;
}

export async function generateFumoSceneImage(
  characterId: string,
  language: Language,
  text: string
): Promise<string | null> {
  const character = CHARACTERS.find(c => c.id === characterId);
  if (!character) return null;

  const prompt = `
Create one cute healing photo of ${character.name[language]} as a Touhou Fumo plush in Gensokyo.
The scene MUST match this text exactly: "${text}".
Style: soft daylight, cozy, plush texture, no extra text watermark.
`;

  // Nano Banana 优先（若配置了 endpoint + key）
  if (NANO_BANANA_ENDPOINT && NANO_BANANA_API_KEY) {
    try {
      const res = await fetch(NANO_BANANA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NANO_BANANA_API_KEY}`,
        },
        body: JSON.stringify({ prompt, characterId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json?.imageUrl === 'string' && json.imageUrl.length > 0) return json.imageUrl;
      }
    } catch {
      // fallback below
    }
  }

  // 回退到 Gemini 图像模型，保证功能可用。
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });
    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function pickRandomCommenters(all: Character[], count: number): Character[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function newCommentId(): string {
  return `ai-c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 用户发动态后，角色评论改走 Gemini，静态模板仅兜底。 */
export async function generateAiMomentCommentsForUserPost(
  characters: Character[],
  language: Language,
  userMomentText: string,
  count = 5
): Promise<MomentComment[]> {
  const commenters = pickRandomCommenters(characters, count);
  const out: MomentComment[] = [];
  for (const c of commenters) {
    const recent = loadRecent(`fumo-ai-recent:moment-comment:${c.id}:${language}`).slice(-6).join('\n');
    const prompt = laneText(
      language,
      `用户发了一条朋友圈：「${userMomentText}」。请以${c.name.zh}口吻回复一句口语短评（不超过28字），符合原作，不要书面化。`,
      `ユーザー投稿「${userMomentText}」へ、${c.name.ja}として一言コメント（28文字以内、口語、原作準拠）。`,
      `A user posted: "${userMomentText}". Reply as ${c.name.en} in one short casual line (<= 28 words), lore-accurate.`
    );
    const systemInstruction = `
Touhou strict roleplay for ${c.name[language]}.
- No OOC/meta/AI.
- Never mention plush/Fumo/doll identity.
- Use ONLY ${language}.
- Keep short, spoken, daily social comment.
- Style: ${styleFor(c.id)}
- Avoid repeating these recent lines:
${recent || '(none)'}
`;
    try {
      const r = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = (r.text || '').trim();
      if (!text) continue;
      saveRecent(`fumo-ai-recent:moment-comment:${c.id}:${language}`, normalizeSig(text));
      out.push({
        id: newCommentId(),
        authorType: 'character',
        characterId: c.id,
        text: { zh: text, ja: text, en: text },
      });
    } catch {
      // ignore single-comment failure
    }
  }
  return out;
}
