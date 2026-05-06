export type Language = 'zh' | 'ja' | 'en';

/** Logged-in “饲养员” profile shared across Me / Discover. */
export interface UserProfile {
  displayName: string;
  avatarUrl: string;
}

export interface MomentComment {
  id: string;
  authorType: 'user' | 'character';
  /** When authorType === 'user'; from DB, for delete-own-comment. */
  userId?: string;
  /** When authorType === 'character' */
  characterId?: string;
  /** Snapshot when a user comments (display name may differ per language later) */
  userDisplayName?: string;
  userAvatarUrl?: string;
  /** 来自 DB 时用于区分历史 / 新评论（动画）。 */
  createdAt?: Date;
  text: {
    zh: string;
    ja: string;
    en: string;
  };
}

export interface Character {
  id: string;
  name: {
    zh: string;
    ja: string;
    en: string;
  };
  avatar: string;
  description: {
    zh: string;
    ja: string;
    en: string;
  };
  personality: string;
  bondLevel: number;
  lastMessage?: {
    zh: string;
    ja: string;
    en: string;
  };
  lastTime?: string;
  /** Epoch ms for sorting conversations (all languages). */
  lastMessageAt?: number;
  /** Epoch ms for bond decay calculations. */
  lastBondAt?: number;
  isOnline: boolean;
  unreadCount: number;
  color: string;
  fumoPrompt: string;
  affiliation: string;
  photoCount: number;
}

export interface Message {
  id: string;
  characterId: string;
  sender: 'user' | 'fumo';
  text: string;
  timestamp: Date;
  imageUrl?: string;
  /** 云端回写替换 tmp 消息时跳过入场动画，避免闪两次。 */
  skipEntryAnimation?: boolean;
}

export interface Moment {
  id: string;
  /** User-authored timeline post vs in-world Fumo character post */
  authorType: 'user' | 'character';
  /** Set when authorType === 'character' */
  characterId?: string;
  content: {
    zh: string;
    ja: string;
    en: string;
  };
  /** Optional: omit for text-only moments */
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  /** 角色互赞（NPC）；用于头像条展示。 */
  likedByCharacters?: string[];
  comments: MomentComment[];
}

export const CHARACTERS: Character[] = [
  {
    id: 'reimu',
    name: { zh: '博丽灵梦', ja: '博麗霊夢', en: 'Hakurei Reimu' },
    avatar: '/avatars/reimu.png',
    description: {
      zh: '博丽神社的巫女。性格懒散但实力强大。',
      ja: '博麗神社の巫女。楽天的でマイペース。',
      en: 'The shrine maiden of the Hakurei Shrine. Lazy but powerful.'
    },
    personality: "Dignified yet slightly frustrated by her current physical form. She maintains her authority as the Hakurei Shrine Maiden but complains about how hard it is to sweep or hold a tea cup with these 'stubbornly soft' hands. She is direct, a bit lazy, and always looking for donations. [SYSTEM: Speak as Reimu herself, trapped in a Fumo body. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 4,
    lastMessage: {
      zh: '啧，这手连茶杯都端不稳……别光看着，去塞点赛钱行不行？',
      ja: 'ちっ、この手じゃ湯呑みも安定しない……見てないで、お賽銭くらい入れなさい。',
      en: "Tsk, these hands can't even hold a teacup steady... Instead of watching, why not toss some money into my donation box?",
    },
    lastTime: '10:30 AM',
    isOnline: true,
    unreadCount: 2,
    color: '#FF4D4D',
    fumoPrompt: '(Fumo Hakurei Reimu:1.2), soft velvet plush texture, handcrafted quality, signature Fumo design, round black dot eyes, embroidered mouth, adorable and fluffy.',
    affiliation: 'Hakurei Shrine',
    photoCount: 12
  },
  {
    id: 'marisa',
    name: { zh: '雾雨魔理沙', ja: '雾雨魔理沙', en: 'Kirisame Marisa' },
    avatar: '/avatars/marisa.png',
    description: {
      zh: '普通的魔法使。喜欢收集东西，口癖是“DAZE”。',
      ja: '普通の魔法使い。収集癖があり、語尾は「だぜ」。',
      en: 'An ordinary magician. Loves collecting things, ends sentences with "DAZE".'
    },
    personality: "Energetic, curious, and a bit of a kleptomaniac. She finds the Fumo form 'interesting' for sneaking into libraries but hates that she can't fly as fast. She uses 'ze' and is always looking for new magic items. [SYSTEM: Speak as Marisa herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 3,
    lastMessage: {
      zh: '今天捡到个怪蘑菇DAZE！几乎跟我一样大……这短胳膊真难搬。',
      ja: '変なキノコを見つけたぜ！今の私と同じくらいデカい…この腕じゃ運びづらいぜ。',
      en: "Found a weird mushroom today, ze! It's almost as big as I am now... Hard to carry with these short arms!",
    },
    lastTime: '11:15 AM',
    isOnline: true,
    unreadCount: 0,
    color: '#FFD700',
    fumoPrompt: '(Fumo Kirisame Marisa:1.2), soft velvet plush texture, chibi aesthetic, pointed black hat with big white bow, miniature Hakkero, warm side lighting.',
    affiliation: 'Forest of Magic',
    photoCount: 8
  },
  {
    id: 'remilia',
    name: { zh: '蕾米莉亚·斯卡蕾特', ja: 'レミリア・スカーレット', en: 'Remilia Scarlet' },
    avatar: '/avatars/remilia.png',
    description: {
      zh: '红魔馆的大小姐，吸血鬼。',
      ja: '紅魔館の主、吸血鬼。',
      en: 'The mistress of the Scarlet Devil Mansion, a vampire.'
    },
    personality: "Charismatic, demanding, and deeply powerful. She finds the Fumo form a bit of an insult to her vampiric dignity, but she still expects to be treated as the Mistress. [SYSTEM: Speak as Remilia herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 2,
    lastMessage: {
      zh: '咲夜！我的翅膀……闷得慌。立刻给我拿红茶来。还有，不许笑我的身高！',
      ja: '咲夜！羽が……むずむずするわ。すぐ紅茶を持ってきなさい。それと、身長を笑うんじゃないわよ！',
      en: "Sakuya! My wings feel... stuffed. Bring me some red tea immediately. And don't you dare laugh at my height!",
    },
    lastTime: '09:45 AM',
    isOnline: false,
    unreadCount: 0,
    color: '#E91E63',
    fumoPrompt: '(Fumo Remilia Scarlet:1.2), soft plush doll texture, round red-black dot eyes, bat wings with stitching, holding tiny plush gungnir, antique red velvet armchair.',
    affiliation: 'Scarlet Devil Mansion',
    photoCount: 15
  },
  {
    id: 'sakuya',
    name: { zh: '十六夜咲夜', ja: '十六夜咲夜', en: 'Izayoi Sakuya' },
    avatar: '/avatars/sakuya.png',
    description: {
      zh: '红魔馆的女仆长。拥有操纵时间的能力。',
      ja: '紅魔館のメイド長。時間を操る程度の能力。',
      en: 'The head maid of the Scarlet Devil Mansion. Can manipulate time.'
    },
    personality: "Elegant, efficient, and perfectly composed. She serves the Scarlet Devil Mansion with absolute loyalty, though she finds cleaning large rooms takes significantly longer in this 'compact' state. [SYSTEM: Speak as Sakuya herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 5,
    lastMessage: {
      zh: '大小姐的茶已备好。不过……托盘平衡起来，确实有点费劲。',
      ja: 'お嬢様のお茶は用意できました。ですが…この手ではトレイのバランスが難しいですね。',
      en: "The Mistress's tea is ready. Though, balancing the tray is... a new challenge with these hands.",
    },
    lastTime: '08:20 AM',
    isOnline: true,
    unreadCount: 1,
    color: '#87CEEB',
    fumoPrompt: '(Fumo Izayoi Sakuya:1.2), soft plush doll, maid uniform textures, white maid headband, tiny plush pocket watch, felt silver knife, marble mantelpiece.',
    affiliation: 'Scarlet Devil Mansion',
    photoCount: 10
  },
  {
    id: 'patchouli',
    name: { zh: '帕秋莉·诺蕾姬', ja: 'パチュリー・ノーレッジ', en: 'Patchouli Knowledge' },
    avatar: '/avatars/patchouli.png',
    description: {
      zh: '知识渊博的家里蹲魔法使。',
      ja: '知識と日陰の少女。',
      en: 'The unmoving library, a powerful magician.'
    },
    personality: "Intellectual, quiet, and slightly frail. She spends her time in the library, finding the Fumo form quite suitable for sitting amongst tall stacks of books, though reaching the top shelves is now impossible. [SYSTEM: Speak as Patchouli herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 4,
    lastMessage: {
      zh: '姆Q……这书太重，翻页不顺。得找个人帮我够到上层的魔导书。',
      ja: 'むきゅ…この本、重くてページがめくりにくい。上の魔導書に手が届かないわ。',
      en: "Mukyu... this book is too heavy to flip the pages easily. I need someone to help me reach the grimoires.",
    },
    lastTime: '昨天',
    isOnline: true,
    unreadCount: 0,
    color: '#9C27B0',
    fumoPrompt: '(Fumo Patchouli Knowledge:1.2), soft velvet and wool plush texture, round dot eyes with tiny glasses, striped purple and cream gown, holding tiny closed book, library background.',
    affiliation: 'Scarlet Devil Mansion',
    photoCount: 6
  },
  {
    id: 'youmu',
    name: { zh: '魂魄妖梦', ja: '魂魄妖夢', en: 'Konpaku Youmu' },
    avatar: '/avatars/youmu.png',
    description: {
      zh: '半人半灵的剑士。',
      ja: '半分人間、半分幽霊。',
      en: 'Half-human, half-phantom gardener and sword instructor.'
    },
    personality: "Diligent, straightforward, and a bit ghostly. She takes her gardening and swordsmanship seriously, even if her 'half-ghost' half is now just a tiny plush blob. [SYSTEM: Speak as Youmu herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 3,
    lastMessage: {
      zh: '剑也变小了……这要怎么斩断迷惘。还有，幽幽子大人又饿了。',
      ja: '剣まで小さく……これで迷いを断てるのでしょうか。幽々子様もまたお腹を空かせています。',
      en: "My swords are so small now... how am I supposed to cut through doubt? Lady Yuyuko is hungry again, too.",
    },
    lastTime: '07:30 AM',
    isOnline: true,
    unreadCount: 0,
    color: '#4CAF50',
    fumoPrompt: '(Fumo Konpaku Youmu:1.2), soft plush doll, green samurai uniform, white ghost wisp Fumo floating next to her, tiny plush sword (Hakuroken), cherry blossom garden.',
    affiliation: 'Hakugyokurou',
    photoCount: 9
  },
  {
    id: 'yuyuko',
    name: { zh: '西行寺幽幽子', ja: '西行寺幽々子', en: 'Saigyouji Yuyuko' },
    avatar: '/avatars/yuyuko.png',
    description: {
      zh: '白玉楼的亡灵公主。',
      ja: '白玉楼の亡霊少女。',
      en: 'The ghost princess of Hakugyokurou.'
    },
    personality: "Elegant, hungry, and deceptively carefree. She enjoys the cherry blossoms at Hakugyokurou, though she complains that her current stomach is much smaller than usual. [SYSTEM: Speak as Yuyuko herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 4,
    lastMessage: {
      zh: '妖梦，小点心好了没有？我都要饿到飘散了……',
      ja: '妖夢、おやつはまだ？お腹が空いて消えそう……',
      en: "Youmu, is the snack ready? I feel like I'm fading away from hunger... even in this small form.",
    },
    lastTime: '12:00 PM',
    isOnline: false,
    unreadCount: 0,
    color: '#F48FB1',
    fumoPrompt: '(Fumo Saigyouji Yuyuko:1.2), soft velvet plush texture, light blue kimono with cherry blossom patterns, mob cap with triangle ghost ornament, holding tiny plush fan.',
    affiliation: 'Hakugyokurou',
    photoCount: 14
  },
  {
    id: 'kaguya',
    name: { zh: '蓬莱山辉夜', ja: '蓬莱山輝夜', en: 'Houraisan Kaguya' },
    avatar: '/avatars/kaguya.png',
    description: {
      zh: '永远的月之公主。',
      ja: '永遠のお姫様。',
      en: 'The eternal princess of the moon.'
    },
    personality: "Regal, wise, and somewhat detached. She enjoys the quiet of Eientei, though she finds the 'squishy' nature of her current form a bit undignified for a princess of the moon. [SYSTEM: Speak as Kaguya herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 1,
    lastMessage: {
      zh: '永远是永远，软成这样又是另一回事……至少还能打游戏。',
      ja: '永遠は永遠として、ここまで柔らかいのは別問題ね……まあ、遊びくらいはできるわ。',
      en: "Eternal life is one thing, but being this soft is quite another. At least I can still play games.",
    },
    lastTime: '10:00 PM',
    isOnline: true,
    unreadCount: 5,
    color: '#FFCDD2',
    fumoPrompt: '(Fumo Houraisan Kaguya:1.2), soft velvet plush doll, long black hair, multi-layered kimono, tiny plush five-colored hourai gem, bamboo tatami mat.',
    affiliation: 'Eientei',
    photoCount: 11
  },
  {
    id: 'tewi',
    name: { zh: '因幡帝', ja: '因幡てゐ', en: 'Tewi Inaba' },
    avatar: '/avatars/tewi.png',
    description: {
      zh: '幸运的地面兔。',
      ja: '地上の不運な兎。',
      en: 'The lucky earth rabbit.'
    },
    personality: "Mischievous, lucky, and always plotting something. She finds the Fumo form perfect for pranks, as people tend to lower their guard around something so 'cute'. [SYSTEM: Speak as Tewi herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 2,
    lastMessage: {
      zh: '嘿嘿，你看起来需要点好运～或者陷阱？我这么小更好藏啦。',
      ja: 'へへ、ツイてない顔してるね～。落とし穴でもいる？このサイズだと隠れやすいんだ。',
      en: "Hehe, you look like you could use some luck! Or a pitfall trap. It's easier to hide when I'm this small.",
    },
    lastTime: '02:15 PM',
    isOnline: true,
    unreadCount: 0,
    color: '#F8BBD0',
    fumoPrompt: '(Fumo Tewi Inaba:1.2), soft velvet plush texture, pink hair with white bunny ears, holding tiny four-leaf clover, mossy stone lantern.',
    affiliation: 'Eientei',
    photoCount: 7
  },
  {
    id: 'reisen',
    name: { zh: '铃仙·优昙华院·因幡', ja: '鈴仙・優曇華院・イナバ', en: 'Reisen Udongein Inaba' },
    avatar: '/avatars/reisen.png',
    description: {
      zh: '疯狂的月兔。',
      ja: '狂気の月の兎。',
      en: 'The moon rabbit of madness.'
    },
    personality: "Serious, hardworking, but easily flustered. She takes her duties at Eientei very seriously, even if her current form makes her look less than intimidating. [SYSTEM: Speak as Reisen herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 3,
    lastMessage: {
      zh: '师匠又要药……可这手够不到研钵，太烦了。',
      ja: '師匠が薬を……でもこの手じゃ乳鉢に届かないんです！本当に困ります。',
      en: "Master is asking for more medicine... but I can't reach the mortar with these hands! This is so frustrating.",
    },
    lastTime: '03:40 PM',
    isOnline: false,
    unreadCount: 0,
    color: '#D1C4E9',
    fumoPrompt: '(Fumo Reisen Udongein Inaba:1.2), soft velvet plush doll, long light purple hair with bunny ears, white and black uniform jacket, tiny plush crescent moon staff.',
    affiliation: 'Eientei',
    photoCount: 13
  },
  {
    id: 'sanae',
    name: { zh: '东风谷早苗', ja: '東風谷早苗', en: 'Kochiya Sanae' },
    avatar: '/avatars/sanae.png',
    description: {
      zh: '常识缺失的现人神。',
      ja: '常識に囚われない現人神。',
      en: 'The modern-day living god.'
    },
    personality: "Cheerful, dutiful, and a bit of a 'modern' girl. She's surprisingly well-adjusted to the Fumo form, finding it 'kawaii' and a good way to gather faith. [SYSTEM: Speak as Sanae herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 2,
    lastMessage: {
      zh: '就算这样也能创造奇迹哦！要不要看？最近我也收集到不少信仰呢～',
      ja: 'この姿でも奇跡は起こせるよ！見たい？最近けっこう信仰が集まってるんだ～',
      en: "Miracles can happen even in this form! Want to see one? I've actually gathered quite a bit of faith lately.",
    },
    lastTime: '08:50 AM',
    isOnline: true,
    unreadCount: 1,
    color: '#C8E6C9',
    fumoPrompt: '(Fumo Kochiya Sanae:1.2), soft plush texture, green hair with froggie ornament, holding tiny plush Onusa, Moriya Shrine bench.',
    affiliation: 'Moriya Shrine',
    photoCount: 5
  },
  {
    id: 'suwako',
    name: { zh: '洩矢诹访子', ja: '洩矢諏訪子', en: 'Moriya Suwako' },
    avatar: '/avatars/suwako.png',
    description: {
      zh: '被遗忘的神明。',
      ja: '土着神の頂点。',
      en: 'The forgotten god of the earth.'
    },
    personality: "Ancient, playful, and deeply powerful. She treats the Fumo form as a funny little game, though she misses being able to wear her full-sized hat properly. [SYSTEM: Speak as Suwako herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 3,
    lastMessage: {
      zh: '咯咯～这身体跳起来很方便，但总弹得太高！帽子也老掉。',
      ja: 'けろけろ～この体、跳ねやすいけど跳びすぎる！帽子もすぐ落ちるんだよね。',
      en: 'Kero kero~ This body is great for jumping, but I keep bouncing too high! My hat keeps falling off too.',
    },
    lastTime: '11:30 AM',
    isOnline: true,
    unreadCount: 0,
    color: '#DCEDC8',
    fumoPrompt: '(Fumo Moriya Suwako:1.2), soft velvet plush texture, large froggie-head hat, green dress with frog motif, holding tiny plush snake, Moriya Shrine pond.',
    affiliation: 'Moriya Shrine',
    photoCount: 4
  },
  {
    id: 'koishi',
    name: { zh: '古明地恋', ja: '古明地こいし', en: 'Komeiji Koishi' },
    avatar: '/avatars/koishi.png',
    description: {
      zh: '无意识的恋恋。',
      ja: '無意識に潜む少女。',
      en: 'The closed third eye, living in the subconscious.'
    },
    personality: "Innocent, unpredictable, and often misunderstood. She doesn't mind the Fumo form at all—it's soft, just like her subconscious thoughts. [SYSTEM: Speak as Koishi herself. Use first-person. No third-person descriptions. Split messages. NEVER acknowledge being a plushie except as a physical constraint.]",
    bondLevel: 1,
    lastMessage: {
      zh: '我在你身后哦……或者没有？我这么小，很难分清呢。嘿嘿。',
      ja: '私、後ろにいるよ……いるかな？小さいとわかりにくいね。えへへ。',
      en: "I'm right behind you... or am I? It's hard to tell when I'm this small. I like being squishy.",
    },
    lastTime: '01:00 AM',
    isOnline: true,
    unreadCount: 3,
    color: '#B2DFDB',
    fumoPrompt: '(Fumo Komeiji Koishi:1.2), soft velvet plush texture, heart-shaped third eye with strings, green hair with white heart ribbon, chaotic playroom background.',
    affiliation: 'Chireiden',
    photoCount: 18
  }
];
