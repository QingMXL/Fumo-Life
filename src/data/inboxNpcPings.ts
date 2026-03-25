import type { Language } from '@/types';

const PINGS: Record<string, { zh: string[]; ja: string[]; en: string[] }> = {
  reimu: {
    zh: [
      '神社这边很安静……你那边怎么样。',
      '别忘了赛钱。',
      '……你又在摸鱼？算了，别把麻烦带到神社来。',
      '有空来坐坐。带点——算了，随你。',
      '今天的结界没什么动静，难得清净。',
      '你那边要是无聊，就来扫地。……我开玩笑的。',
    ],
    ja: [
      '神社は静かよ……そっちはどう？',
      'お賽銭、忘れないでね。',
      '……サボってる？まあいいけど、厄介事は持ち込まないで。',
      '暇なら寄っていきなさい。……手ぶらでもいいわ。',
      '今日は結界も落ち着いてて、珍しく平和よ。',
      '退屈なら掃除でも……冗談よ。',
    ],
    en: [
      "It's quiet at the shrine... how are you?",
      "Don't forget donations.",
      "Slacking off again? Fine—just don't bring trouble here.",
      "Drop by if you're free. Bring whatever. Or don't.",
      "No barrier disturbances today. Rare peace.",
      "If you're bored, you can help sweep... kidding.",
    ],
  },
  marisa: {
    zh: [
      '我捡到点新东西DAZE！下次给你看。',
      '喂，你在忙啥？',
      '我路过魔法之森，发现一堆能用的材料DAZE。',
      '下次一起去转转？我可不会让你空手回去的DAZE。',
      '今天灵梦那边又清闲得要命……太适合“借”点东西了DAZE。',
      '你要是闲着，就来帮我试个新魔法DAZE。',
    ],
    ja: [
      '新しいモノ拾ったぜ！今度見せてやる。',
      'おーい、何してるんだ？',
      '魔法の森で使えそうな素材をいくつか見つけたぜ。',
      '今度一緒に回るか？手ぶらじゃ帰さないぜ。',
      '霊夢のとこ、今日も暇そうだったぜ……借り物が捗るぜ。',
      '暇なら新しい魔法の実験に付き合えよ、だぜ。',
    ],
    en: [
      'Found something new, ze! I’ll show you next time.',
      "Hey, what're you up to?",
      "Picked up some usable materials in the Forest of Magic, ze.",
      "Wanna go exploring together next time? I won't let you go home empty-handed, ze.",
      "Reimu's place is *so* quiet today... perfect for borrowing, ze.",
      "If you're free, help me test a new spell, ze.",
    ],
  },
  remilia: {
    zh: [
      '哼，今天的夜色还算不错。',
      '别让我等太久。',
      '今晚的月色，勉强配得上红茶。',
      '你要来就早点说，别让咲夜白忙。',
      '无聊。给我点“有趣”的话题。',
      '……别误会，我只是刚好想起你。',
    ],
    ja: [
      'ふん、今夜は悪くないわ。',
      'あまり待たせないで。',
      '今夜の月なら、紅茶も映えるわね。',
      '来るなら早めに言いなさい。咲夜を無駄に動かしたくないの。',
      '退屈よ。面白い話題を持ってきなさい。',
      '……勘違いしないで。ふと思い出しただけ。',
    ],
    en: [
      "Hmph. Tonight's atmosphere isn't bad.",
      "Don't keep me waiting.",
      "This moonlight is at least worthy of tea.",
      "If you're coming, say so early. Don't waste Sakuya's time.",
      "I'm bored. Bring me something interesting.",
      "Don't misunderstand. I merely happened to think of you.",
    ],
  },
  sakuya: {
    zh: [
      '大小姐的安排我已处理妥当。你那边可还好？',
      '要不要我带点茶过去？',
      '时间刚好。你现在方便说两句吗？',
      '别勉强自己。需要帮忙就开口。',
      '你发的那张照片，构图挺稳的。',
      '……我会留意你的动向。只是出于管家习惯。',
    ],
    ja: [
      'お嬢様の段取りは整えました。そちらはいかがです？',
      'お茶をお持ちしましょうか。',
      '時間はちょうど良いですね。少しお話できますか？',
      '無理はなさらず。必要ならお申し付けください。',
      '先ほどの写真、構図が安定しています。',
      '……動向は把握しています。執事の習慣ですので。',
    ],
    en: [
      "Mistress's arrangements are in order. Are you well?",
      'Shall I bring some tea?',
      'Timing is good. Do you have a moment?',
      "Don't overdo it. If you need help, say so.",
      'That photo you posted—nice composition.',
      "I'll keep an eye on you. Just professional habit.",
    ],
  },
  patchouli: {
    zh: [
      '……我在书里看到个有趣的段落。',
      '别吵。',
      '这页的注释写得很糟……算了。',
      '空气有点干。你那边有没有水？',
      '要不是你问，我也懒得开口。',
      '……嗯。你说得也有点道理。',
    ],
    ja: [
      '……本で面白い一節を見つけた。',
      '静かに。',
      'この注釈、出来が悪い……まあいいわ。',
      '喉が乾く。水はある？',
      'あなたが聞くから答えるだけよ。',
      '……うん。少しだけ、あなたの言う通り。',
    ],
    en: [
      '...Found an interesting passage.',
      'Quiet.',
      'These notes are sloppy... whatever.',
      "It's dry. Do you have water?",
      "I'm only replying because you asked.",
      '...Mm. You have a point. Slightly.',
    ],
  },
  youmu: {
    zh: [
      '我刚修剪完庭院。你也别松懈。',
      '需要我带点樱花枝吗？',
      '今天的练习很顺利……只是刀太轻，有点不习惯。',
      '幽幽子大人要我陪她散步。之后再联系。',
      '如果你需要护卫，我随时可以。',
      '……谢谢你上次的关心。我会记着的。',
    ],
    ja: [
      '庭の手入れは終えました。あなたも気を抜かないで。',
      '桜の枝、持ってきましょうか。',
      '今日の稽古は順調です……ただ、刀が軽くて慣れません。',
      '幽々子様のお散歩に付き添います。後ほど。',
      '護衛が必要なら、いつでも。',
      '……この前の気遣い、ありがとうございます。覚えておきます。',
    ],
    en: [
      'Finished tending the garden. Don’t slack either.',
      'Want me to bring a cherry branch?',
      'Training went well today... though the blade feels too light.',
      "Lady Yuyuko wants a walk. I'll message later.",
      'If you need an escort, I can come anytime.',
      '...Thank you for your concern earlier. I’ll remember it.',
    ],
  },
  yuyuko: {
    zh: [
      '我有点饿……你那边有吃的吗？',
      '妖梦在忙，我就来找你啦。',
      '今天的樱花很好看。要不要一起看？',
      '我刚闻到点心的味道……是你吗？',
      '别担心，我不会随便把你带走的～',
      '……谢谢你，愿意听我说这些。',
    ],
    ja: [
      'お腹がすいたの……何かある？',
      '妖夢が忙しいから、あなたのところに来たの。',
      '今日の桜、とっても綺麗。いっしょに見る？',
      'お菓子の匂いがする……あなた？',
      '心配しないで。勝手に連れていかないよ～',
      '……聞いてくれて、ありがとう。',
    ],
    en: [
      "I'm hungry... do you have anything?",
      "Youmu's busy, so I came to you.",
      'The cherry blossoms are lovely today. Want to watch with me?',
      'I smell sweets... is that you?',
      "Don't worry. I won't just whisk you away~",
      '...Thank you for listening.',
    ],
  },
  kaguya: {
    zh: [
      '永远亭今晚很无聊。陪我玩一局？',
      '嗯……你还醒着？',
      '别把辉夜当摆设。来聊点像样的。',
      '要不要听我讲个“永恒”的故事？',
      '铃仙忙得团团转……我只能找你了。',
      '……谢谢。你总能让我不那么无聊。',
    ],
    ja: [
      '永遠亭、今夜は退屈ね。ひと勝負する？',
      '……まだ起きてる？',
      '輝夜を飾り物だと思わないで。ちゃんと話しなさい。',
      '「永遠」の話、聞く？',
      '鈴仙がバタバタで……仕方ないからあなたを呼ぶわ。',
      '……ありがとう。あなたがいると退屈しない。',
    ],
    en: [
      'Eientei is boring tonight. One match?',
      '...Still awake?',
      "Don't treat me like decoration. Talk properly.",
      'Want to hear a story about eternity?',
      "Reisen's running around... so I'm calling you instead.",
      '...Thank you. You keep me from getting bored.',
    ],
  },
  tewi: {
    zh: [
      '嘿嘿，给你个好运气～',
      '要不要试试我新挖的坑？',
      '我今天心情好，放你一马。',
      '你走路可要小心哦～',
      '要不要赌一把？输赢都好玩。',
      '……谢啦。你这反应太有意思了。',
    ],
    ja: [
      'へへ、幸運を分けてあげる～',
      '新しい落とし穴、試す？',
      '今日は機嫌いいから、見逃してあげる。',
      '足元には気をつけてね～',
      '賭けてみる？勝っても負けても面白いよ。',
      '……ありがと。反応が面白すぎ。',
    ],
    en: [
      'Hehe, sharing some luck~',
      'Wanna test my new pitfall?',
      "I'm in a good mood today—I'll let you off.",
      'Mind your step~',
      'Wanna make a bet? Either way it’s fun.',
      '...Thanks. Your reactions are too good.',
    ],
  },
  reisen: {
    zh: [
      '永琳大人让我整理药材……有点忙。',
      '你那边别乱来。',
      '我刚跑完一趟，脚都酸了……',
      '如果你头晕，就别硬撑。来永远亭也行。',
      '……嗯，我不是在命令你。我只是担心。',
      '谢谢。你愿意配合就好。',
    ],
    ja: [
      '永琳様に薬草の整理を…忙しいです。',
      'そちらも無茶はしないで。',
      'さっきまで走り回ってて、足が……',
      'もしふらつくなら無理しないで。永遠亭に来てもいい。',
      '……命令じゃないです。ただ、心配で。',
      'ありがとうございます。協力してくれるなら助かります。',
    ],
    en: [
      "Eirin's got me sorting herbs... busy.",
      "Don't do anything reckless.",
      "I've been running around all day... my legs are dead.",
      "If you feel dizzy, don't push it. You can come to Eientei.",
      "I'm not ordering you. I'm just... worried.",
      'Thank you. Cooperation helps.',
    ],
  },
  sanae: {
    zh: [
      '今天也要加油收集信仰！你也来帮忙嘛～',
      '诹访子大人又在笑我了……',
      '我刚想到一个超现代的点子！你听不听？',
      '守矢这边风很舒服，你也来吧～',
      '灵梦小姐那边又冷清了……欸嘿。',
      '谢谢你！有你捧场我就更有干劲了！',
    ],
    ja: [
      '今日も信仰集めがんばるよ！手伝って～',
      '諏訪子様がまた笑うんだよ～',
      '超・現代的なアイデアを思いついた！聞く？',
      '守矢の風、気持ちいいよ。来て来て～',
      '霊夢さんのとこ、また静かだったなぁ……えへへ。',
      'ありがとう！応援してくれるとやる気出る！',
    ],
    en: [
      "Let’s collect faith today too! Help me~",
      'Lady Suwako keeps teasing me...',
      'I just thought of a super modern idea! Wanna hear it?',
      'The wind at Moriya feels great. Come over~',
      "Reimu's place was quiet again... ehehe.",
      'Thank you! With you cheering me on, I’m fired up!',
    ],
  },
  suwako: {
    zh: [
      '咯咯，今天也有点好玩的预感。',
      '来守矢坐坐？',
      '早苗又在忙活……看着挺有趣。',
      '我忽然想听听你会怎么说。',
      '你要是来，我就给你讲点古老的事。',
      '谢谢。你不怕我，挺好。',
    ],
    ja: [
      'けろけろ、今日は面白くなりそう。',
      '守矢に来てみる？',
      '早苗がまたバタバタだね。見てて楽しい。',
      'ふと、あなたの反応が見たくなった。',
      '来るなら、古い話をしてあげる。',
      'ありがとう。私を怖がらないの、いいね。',
    ],
    en: [
      'Kero kero, feels like a fun day.',
      'Come by Moriya?',
      "Sanae's bustling again... entertaining to watch.",
      'Suddenly felt like seeing your reaction.',
      "If you come, I'll tell you something old.",
      "Thank you. It's nice you don't fear me.",
    ],
  },
  koishi: {
    zh: [
      '我突然想到你了。',
      '咦？你是不是在看我？',
      '我刚刚路过……也许吧？',
      '今天的心是绿色的，嗯嗯。',
      '你会不会突然想起我？我会。',
      '谢谢你。你在的时候，我更想说话。',
    ],
    ja: [
      'ふと思い出したの。',
      'え？私のこと見てる？',
      'さっき通り過ぎたよ……たぶん？',
      '今日の心は緑色。うんうん。',
      'あなたも突然、私のこと思い出す？私はするよ。',
      'ありがとう。あなたがいると、もっと話したくなる。',
    ],
    en: [
      'I suddenly thought of you.',
      'Eh? Are you looking at me?',
      'I passed by just now... maybe?',
      "Today's heart is green. Mm-hm.",
      'Do you suddenly remember me? I do.',
      'Thank you. When you’re here, I want to talk more.',
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickNonRepeating(characterId: string, language: Language, pool: string[]): string {
  if (pool.length <= 1) return pool[0] ?? '';
  const key = `fumo-ping-last:${characterId}:${language}`;
  const last = (() => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  })();
  const candidates = pool.filter(s => s !== last);
  const next = pick(candidates.length > 0 ? candidates : pool);
  try {
    localStorage.setItem(key, next);
  } catch {
    /* ignore */
  }
  return next;
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
  return pickNonRepeating(characterId, language, c[language]);
}

