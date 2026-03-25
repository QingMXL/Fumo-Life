import type { Character, MomentComment } from '@/types';

/** In-character short replies for NPCs reacting to the user's moment (Touhou-consistent tone, no OOC plush meta). */
const USER_POST_REPLIES: Record<
  string,
  { zh: string; ja: string; en: string }[]
> = {
  reimu: [
    { zh: '……行吧，别太晚睡。', ja: '……まあ、夜更かししすぎるなよ。', en: '...Fine. Don’t stay up too late.' },
    { zh: '有空记得来塞钱。', ja: '暇ならお賽銭を持ってきなさい。', en: 'Bring some donations when you visit.' },
  ],
  marisa: [
    { zh: '不错嘛！下次一起去捡材料DAZE！', ja: 'いいね！次は一緒に素材拾いに行くぜ！', en: 'Nice! Let’s go gather materials together next time, ze!' },
    { zh: '哈？你那边也挺好玩的嘛。', ja: 'ははっ、そっちも楽しそうだぜ。', en: 'Heh, looks fun on your end too.' },
  ],
  remilia: [
    { zh: '哼，还算有点品味。', ja: 'ふん、センスだけはあるようね。', en: 'Hmph. At least you have some taste.' },
    { zh: '茶会缺人就叫咲夜去接你。', ja: 'お茶会に人が足りなければ咲夜を送るわ。', en: 'If tea runs short of guests, Sakuya can fetch you.' },
  ],
  sakuya: [
    { zh: '时间刚好。需要我顺路带点什么吗？', ja: '時間は丁度よいですね。何かお持ちしましょうか？', en: 'Timing is good. Shall I bring anything on the way?' },
    { zh: '照片构图不错，大小姐也会喜欢的。', ja: '構図は良いですね。お嬢様もお気に召すでしょう。', en: 'Nice composition. The Mistress would approve.' },
  ],
  patchouli: [
    { zh: '……嗯。别吵到我读书。', ja: '……うん。読書の邪魔はしないで。', en: '...Mm. Don’t disturb my reading.' },
    { zh: '记录一下也好，省得忘了。', ja: '記録しておくのは悪くないわ。忘れ防止になるし。', en: 'Recording it isn’t bad. Easier not to forget.' },
  ],
  youmu: [
    { zh: '我会向幽幽子大人汇报的。', ja: '幽々子様に報告しておきます。', en: 'I’ll report to Lady Yuyuko.' },
    { zh: '……别太松懈，修行还要继续。', ja: '……油断は禁物です。修行は続きます。', en: '...Don’t slack. Training continues.' },
  ],
  yuyuko: [
    { zh: '看起来好好吃……啊，我是说很好看哦？', ja: 'おいしそ……じゃなくて、きれいね？', en: 'Looks delicious—I mean, lovely, yes?' },
    { zh: '妖梦，我们也去散步吧。', ja: '妖夢、私たちもお散歩しましょう。', en: 'Youmu, let’s take a stroll too.' },
  ],
  kaguya: [
    { zh: '永恒里多一条记录也不坏。', ja: '永遠に記録が一つ増えるのも悪くないわ。', en: 'Another entry in eternity isn’t so bad.' },
    { zh: '……哼，还算有点意思。', ja: '……ふん、悪くないわね。', en: '...Hmph. Not entirely boring.' },
  ],
  tewi: [
    { zh: '嘿嘿，运气不错嘛～', ja: 'へへ、ツイてるじゃん。', en: 'Hehe, someone’s lucky today~' },
    { zh: '小心脚下哦？', ja: '足元には気をつけてね？', en: 'Mind your step, okay?' },
  ],
  reisen: [
    { zh: '……我会转告永琳大人的。', ja: '……永琳様には伝えておきます。', en: '...I’ll let Eirin know.' },
    { zh: '别太累，药箱还够。', ja: '無理しないで。薬箱はまだあります。', en: 'Don’t overdo it. The medicine box isn’t empty yet.' },
  ],
  sanae: [
    { zh: '奇迹也会眷顾认真记录生活的人哦！', ja: '記録する人には奇跡も微笑むよ！', en: 'Miracles smile on people who keep records!' },
    { zh: '下次来守矢玩吧～', ja: '今度守矢に遊びに来てね～', en: 'Come visit Moriya next time~' },
  ],
  suwako: [
    { zh: '咯咯，挺会玩的嘛。', ja: 'けろけろ、やるじゃん。', en: 'Kero kero, not bad at all.' },
    { zh: '地底的石头可都看着呢。', ja: '地の底の石も見てるからね。', en: 'The stones below are watching too.' },
  ],
  koishi: [
    { zh: '我也在看你哦～……开玩笑的？', ja: '私も見てるよ～……なんてね？', en: 'I’m watching you too~ ...Maybe?' },
    { zh: '嗯～今天的心绪是粉红色的。', ja: 'ん～今日の心はピンク色。', en: 'Mm~ today’s mood is pink.' },
  ],
};

/** Replies when character B comments on character A's moment (relationship-flavored). */
const CHARACTER_THREAD_REPLIES: Record<string, Record<string, { zh: string; ja: string; en: string }>> = {
  reimu: {
    marisa: { zh: '少打神社的主意啦！', ja: '神社の手を出すな！', en: 'Quit eyeing my shrine!' },
  },
  marisa: {
    reimu: { zh: '灵梦别那么小气嘛～', ja: '霊夢、ケチケチすんなよ～', en: 'Reimu, don’t be stingy~' },
    patchouli: { zh: '下次去借两本书DAZE！', ja: '次は本を借りに行くぜ！', en: 'Next time I’m borrowing books, ze!' },
  },
  sakuya: {
    remilia: { zh: '是，大小姐。', ja: 'はい、お嬢様。', en: 'Yes, Mistress.' },
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickNonRepeatingText(
  key: string,
  pool: { zh: string; ja: string; en: string }[]
): { zh: string; ja: string; en: string } {
  if (pool.length <= 1) return pool[0]!;
  const storageKey = `fumo-moment-reply-last:${key}`;
  const last = (() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  })();
  const candidates = pool.filter(t => t.zh !== last && t.ja !== last && t.en !== last);
  const next = pick(candidates.length > 0 ? candidates : pool);
  try {
    // store zh lane; good enough to avoid immediate repeats across languages
    localStorage.setItem(storageKey, next.zh);
  } catch {
    /* ignore */
  }
  return next;
}

function newCommentId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pickRandomCommenters(
  all: Character[],
  excludeId: string | null,
  count: number,
  alsoExclude: Set<string> = new Set()
): Character[] {
  const pool = all.filter(
    c => (excludeId == null || c.id !== excludeId) && !alsoExclude.has(c.id)
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** NPC likes + comments when the user posts a moment. */
export function buildEngagementForUserPost(
  characters: Character[],
  count = 5
): { likesDelta: number; comments: MomentComment[] } {
  const commenters = pickRandomCommenters(characters, null, count);
  const comments: MomentComment[] = commenters.map(c => {
    const pool = USER_POST_REPLIES[c.id] ?? USER_POST_REPLIES.reimu;
    const text = pickNonRepeatingText(`userpost:${c.id}`, pool);
    return {
      id: newCommentId(),
      authorType: 'character',
      characterId: c.id,
      text,
    };
  });
  return { likesDelta: comments.length, comments };
}

/** NPC likes + comments when a character posts (others react). */
export function buildEngagementForCharacterPost(
  characters: Character[],
  posterId: string,
  existingCharacterCommentIds: Set<string>,
  count = 4
): { likesDelta: number; comments: MomentComment[] } {
  const commenters = pickRandomCommenters(
    characters,
    posterId,
    count,
    existingCharacterCommentIds
  );
  const comments: MomentComment[] = commenters.map(c => {
    const thread = CHARACTER_THREAD_REPLIES[c.id]?.[posterId];
    const text = thread ?? pick(USER_POST_REPLIES[c.id] ?? USER_POST_REPLIES.reimu);
    return {
      id: newCommentId(),
      authorType: 'character',
      characterId: c.id,
      text,
    };
  });
  return { likesDelta: comments.length, comments };
}
