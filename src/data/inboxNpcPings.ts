import type { Language } from '@/types';

const PINGS: Record<string, { zh: string[]; ja: string[]; en: string[] }> = {
  reimu: {
    zh: ['神社这边很安静……你那边怎么样。', '别忘了赛钱。'],
    ja: ['神社は静かよ……そっちはどう？', 'お賽銭、忘れないでね。'],
    en: ["It's quiet at the shrine... how are you?", "Don't forget donations."],
  },
  marisa: {
    zh: ['我捡到点新东西DAZE！下次给你看。', '喂，你在忙啥？'],
    ja: ['新しいモノ拾ったぜ！今度見せてやる。', 'おーい、何してるんだ？'],
    en: ['Found something new, ze! I’ll show you next time.', 'Hey, what’re you up to?'],
  },
  remilia: {
    zh: ['哼，今天的夜色还算不错。', '别让我等太久。'],
    ja: ['ふん、今夜は悪くないわ。', 'あまり待たせないで。'],
    en: ["Hmph. Tonight's atmosphere isn't bad.", "Don't keep me waiting."],
  },
  sakuya: {
    zh: ['大小姐的安排我已处理妥当。你那边可还好？', '要不要我带点茶过去？'],
    ja: ['お嬢様の段取りは整えました。そちらはいかがです？', 'お茶をお持ちしましょうか。'],
    en: ["Mistress's arrangements are in order. Are you well?", 'Shall I bring some tea?'],
  },
  patchouli: {
    zh: ['……我在书里看到个有趣的段落。', '别吵。'],
    ja: ['……本で面白い一節を見つけた。', '静かに。'],
    en: ['...Found an interesting passage.', 'Quiet.'],
  },
  youmu: {
    zh: ['我刚修剪完庭院。你也别松懈。', '需要我带点樱花枝吗？'],
    ja: ['庭の手入れは終えました。あなたも気を抜かないで。', '桜の枝、持ってきましょうか。'],
    en: ['Finished tending the garden. Don’t slack either.', 'Want me to bring a cherry branch?'],
  },
  yuyuko: {
    zh: ['我有点饿……你那边有吃的吗？', '妖梦在忙，我就来找你啦。'],
    ja: ['お腹がすいたの……何かある？', '妖夢が忙しいから、あなたのところに来たの。'],
    en: ["I'm hungry... do you have anything?", "Youmu's busy, so I came to you."],
  },
  kaguya: {
    zh: ['永远亭今晚很无聊。陪我玩一局？', '嗯……你还醒着？'],
    ja: ['永遠亭、今夜は退屈ね。ひと勝負する？', '……まだ起きてる？'],
    en: ['Eientei is boring tonight. One match?', '...Still awake?'],
  },
  tewi: {
    zh: ['嘿嘿，给你个好运气～', '要不要试试我新挖的坑？'],
    ja: ['へへ、幸運を分けてあげる～', '新しい落とし穴、試す？'],
    en: ['Hehe, sharing some luck~', 'Wanna test my new pitfall?'],
  },
  reisen: {
    zh: ['永琳大人让我整理药材……有点忙。', '你那边别乱来。'],
    ja: ['永琳様に薬草の整理を…忙しいです。', 'そちらも無茶はしないで。'],
    en: ["Eirin's got me sorting herbs... busy.", "Don't do anything reckless."],
  },
  sanae: {
    zh: ['今天也要加油收集信仰！你也来帮忙嘛～', '诹访子大人又在笑我了……'],
    ja: ['今日も信仰集めがんばるよ！手伝って～', '諏訪子様がまた笑うんだよ～'],
    en: ["Let’s collect faith today too! Help me~", 'Lady Suwako keeps teasing me...'],
  },
  suwako: {
    zh: ['咯咯，今天也有点好玩的预感。', '来守矢坐坐？'],
    ja: ['けろけろ、今日は面白くなりそう。', '守矢に来てみる？'],
    en: ["Kero kero, feels like a fun day.", 'Come by Moriya?'],
  },
  koishi: {
    zh: ['我突然想到你了。', '咦？你是不是在看我？'],
    ja: ['ふと思い出したの。', 'え？私のこと見てる？'],
    en: ['I suddenly thought of you.', 'Eh? Are you looking at me?'],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function pickIncomingPing(characterId: string, language: Language): string {
  const c = PINGS[characterId];
  if (!c) {
    return language === 'zh'
      ? '……在吗？'
      : language === 'ja'
        ? '……いる？'
        : '...You there?';
  }
  return pick(c[language]);
}

