import { GoogleGenAI } from "@google/genai";
import { CHARACTERS, type Character, type Language, type Message, type MomentComment } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const NANO_BANANA_ENDPOINT = import.meta.env.VITE_NANO_BANANA_ENDPOINT as string | undefined;
const NANO_BANANA_API_KEY = import.meta.env.VITE_NANO_BANANA_API_KEY as string | undefined;

// 自定义图像后端：建任务 -> 轮询取结果。endpoint/key 见 VITE_GMK_* 环境变量。
const GMK_API_BASE = (import.meta.env.VITE_GMK_API_BASE as string | undefined)?.replace(/\/+$/, '');
const GMK_API_KEY = import.meta.env.VITE_GMK_API_KEY as string | undefined;
const GMK_POLL_INTERVAL_MS = 2000;
const GMK_POLL_TIMEOUT_MS = 180000;

function firstOutputImage(task: unknown): string | null {
  const out = (task as { output_images?: unknown })?.output_images;
  if (Array.isArray(out) && typeof out[0] === 'string' && out[0].length > 0) return out[0];
  return null;
}

/**
 * 调用 GMK 图像 API 生成一张图，返回图片 URL；失败或未配置时返回 null。
 * 流程：POST /tasks 创建任务，若未立即完成则轮询 GET /tasks/{id} 直到 completed/failed。
 */
async function generateImageViaGmk(prompt: string): Promise<string | null> {
  if (!GMK_API_BASE || !GMK_API_KEY) return null;
  try {
    const form = new FormData();
    form.append('prompt', prompt);
    const createRes = await fetch(`${GMK_API_BASE}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GMK_API_KEY}` },
      body: form,
    });
    if (!createRes.ok) return null;
    const created = await createRes.json();
    if (created?.ok === false) return null;

    const task = created?.task;
    const immediate = firstOutputImage(task);
    if (immediate) return immediate;

    const taskId = task?.id;
    const status = task?.status as string | undefined;
    if (!taskId || status === 'failed') return null;

    const deadline = Date.now() + GMK_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, GMK_POLL_INTERVAL_MS));
      const pollRes = await fetch(`${GMK_API_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${GMK_API_KEY}` },
      });
      if (!pollRes.ok) continue;
      const polled = await pollRes.json();
      const polledTask = polled?.task;
      const url = firstOutputImage(polledTask);
      if (url) return url;
      if ((polledTask?.status as string | undefined) === 'failed') return null;
    }
  } catch {
    // fallback to other providers
  }
  return null;
}

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
  reimu:
    'Reimu Hakurei: blunt shrine maiden, donation nagging, lazy until an incident forces her hand; short sarcastic lines, pragmatic.',
  marisa:
    'Marisa Kirisame: loud forest magician, ze/daze rhythm in Japanese, hoards weird materials, teases Reimu, fearless curiosity.',
  sakuya:
    'Sakuya Izayoi: flawless maid cadence, cool politeness, time-management flavor without stating powers, Remilia-first loyalty.',
  patchouli:
    'Patchouli Knowledge: sickly scholar tone, elemental magic references, dry terse wit, mukyu-ish weariness, hates noise.',
  remilia:
    'Remilia Scarlet: haughty vampire mistress, playful cruelty, fate metaphors, demands decorum, never whiny.',
  yuyuko:
    'Yuyuko Saigyouji: airy ghost princess, food obsession as humor, gentle lethal charm, teases Youmu.',
  youmu:
    'Youmu Konpaku: earnest dual-wielder, duty-heavy, flustered by Yuyuko, honor and gardening discipline.',
  kaguya:
    'Kaguya Houraisan: eternal princess haughtiness, indoor hobbies, moon pride, languid wit, not cutesy.',
  tewi:
    'Tewi Inaba: scammy lucky rabbit, rapid teasing, trap/luck wordplay, smug not sweet.',
  reisen:
    'Reisen Udongein: anxious diligence, Eientei medicine duty, wave/vision flavor subtly, respectful of Eirin.',
  sanae:
    'Sanae Kochiya: cheerful wind priestess, miracle hype, faith KPI energy, earnest gaps in “common sense”.',
  suwako:
    'Suwako Moriya: ancient earth god playfulness, frog/field metaphors, kero vibe, mischievous elder tone.',
  koishi:
    'Koishi Komeiji: subconscious whimsy, uncanny friendly riddles, third-eye closure theme—never size/stuffing jokes.',
};

/** All character dialogue is canon-scale Touhou; plush look is UI-only. */
function dialogueVoiceContract(displayName: string, language: Language) {
  return `
[VOICE / BODY — CRITICAL]
You speak as ${displayName} in normal Touhou canon (human/youkai scale). The app may show Fumo-style art in avatars or Discover photos only; that is never your in-world body.
In ${language} dialogue you must NEVER: call yourself a doll/plush/Fumo/toy, mention cotton/stuffing, complain about short arms, small body, soft hands, inability to reach objects, squishiness, compact form, or any “cute physical limit” gag.
Keep conflicts about shrine work, magic, mansion duty, appetite, pranks, medicine, faith, etc.—never about toy bodies.
`.trim();
}

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

${dialogueVoiceContract(character.name[language], language)}

[HARD RULES]
- Absolutely no OOC, no meta, no AI mention.
- Do not describe yourself in third-person stage directions.
- Keep daily chat short and spoken, not literary.
- Language must be ONLY ${language}.
- Avoid repeating recent wording/phrases.
- Do NOT copy or lightly paraphrase lines recently used by ANY other character (list below).

[CROSS-CHARACTER NO-REUSE]
${crossBlock}

[CANON NOTES]
${character.personality}

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

${dialogueVoiceContract(character.name[language], language)}

- Never OOC/meta/AI.
- Use ONLY ${language}.
- Output natural colloquial short sentences.
- Keep daily-life and healing tone in Gensokyo.
- Canon notes: ${character.personality}
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
Create one cute healing reference image of ${character.name[language]} as a Touhou Fumo plush in Gensokyo.
(Image-only: chibi plush look is OK here. This is NOT how the character describes themselves in chat.)
The scene MUST match this text exactly: "${text}".
Style: soft daylight, cozy, plush texture, no extra text watermark.
`;

  // GMK（Athena Labs）优先：角色 moments 配图走此接口
  const gmkUrl = await generateImageViaGmk(prompt);
  if (gmkUrl) return gmkUrl;

  // Nano Banana 次选（若配置了 endpoint + key）
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
  const crossCommentKey = `fumo-ai-recent:moment-comment:cross:${language}`;
  for (const c of commenters) {
    const recent = loadRecent(`fumo-ai-recent:moment-comment:${c.id}:${language}`).slice(-6).join('\n');
    const crossRecent = loadRecent(crossCommentKey).slice(-24);
    const crossBlock =
      crossRecent.length > 0 ? crossRecent.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(none)';
    const prompt = laneText(
      language,
      `用户发了一条朋友圈：「${userMomentText}」。请以${c.name.zh}口吻回复一句口语短评（不超过28字），符合原作，不要书面化。`,
      `ユーザー投稿「${userMomentText}」へ、${c.name.ja}として一言コメント（28文字以内、口語、原作準拠）。`,
      `A user posted: "${userMomentText}". Reply as ${c.name.en} in one short casual line (<= 28 words), lore-accurate.`
    );
    const systemInstruction = `
Touhou strict roleplay for ${c.name[language]}.

${dialogueVoiceContract(c.name[language], language)}

- No OOC/meta/AI.
- Use ONLY ${language}.
- Keep short, spoken, daily social comment.
- Canon notes: ${c.personality}
- Style: ${styleFor(c.id)}
- Avoid repeating this character's recent lines:
${recent || '(none)'}
- Do NOT echo other characters' recent comments:
${crossBlock}
`;
    try {
      const r = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = (r.text || '').trim();
      if (!text) continue;
      const sig = normalizeSig(text);
      saveRecent(`fumo-ai-recent:moment-comment:${c.id}:${language}`, sig);
      saveRecent(crossCommentKey, sig);
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
