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
  /** User-authored timeline post vs in-world character post (avatars may use Fumo art; text is canon voice). */
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
    personality:
      'Hakurei shrine maiden: blunt, lazy about chores but competent when it matters, nagging about donations and shrine upkeep, pragmatic about incidents. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 4,
    lastMessage: {
      zh: '啧，神社今天也挺闲……有空就来一趟，点心自己带啊。',
      ja: 'ちっ、今日も神社は暇ね。暇なら寄りなさいよ、おやつは自分で持ってきなさい。',
      en: "Tsk. Another slow day at the shrine—drop by if you're free, and bring your own snacks.",
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
    name: { zh: '雾雨魔理沙', ja: '霧雨魔理沙', en: 'Kirisame Marisa' },
    avatar: '/avatars/marisa.png',
    description: {
      zh: '普通的魔法使。喜欢收集东西，口癖是“DAZE”。',
      ja: '普通の魔法使い。収集癖があり、語尾は「だぜ」。',
      en: 'An ordinary magician. Loves collecting things, ends sentences with "DAZE".'
    },
    personality:
      'Forest magician: loud, curious, light kleptomania toward books and materials, competitive streak with Reimu, ends Japanese lines with だぜ energy. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 3,
    lastMessage: {
      zh: '魔法之森捡到个好素材DAZE！下次让你见识下新魔炮。',
      ja: '魔法の森でいい素材拾ったぜ！今度新しいスパーク見せてやる。',
      en: "Snagged great stuff in the Forest of Magic, ze! I'll show you a new spark next time.",
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
    personality:
      'Scarlet Devil Mistress: proud vampire, fate and "play" metaphors, demands respect, teasing menace, tea and night life. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 2,
    lastMessage: {
      zh: '红茶要凉了。你来得正好——坐下，陪我喝完这一杯。',
      ja: '紅茶が冷めるわ。ちょうどいいところに来たわね——座って、最後まで付き合いなさい。',
      en: "The tea's cooling. Good timing—sit, and stay until we finish this cup.",
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
    personality:
      'Perfect maid: calm, precise, loyal to Remilia, time-stop undertones, polite distance with guests. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 5,
    lastMessage: {
      zh: '茶与点心已备好。若你来红魔馆，请提前告知，我好留出接待的时间。',
      ja: 'お茶と茶菓子の準備はできています。いらっしゃるなら前もってお知らせください。',
      en: "Tea and sweets are ready. If you'll visit the mansion, tell me in advance so I can spare proper time.",
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
    personality:
      'Voile librarian: sickly scholar, elemental magic nerd, dry wit, low stamina, hates noise and interruptions. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 4,
    lastMessage: {
      zh: '姆Q……别在书架边吵，我正看到火水相克那一章。',
      ja: 'むきゅ……棚の近くで騒がないで。火と水の相克の章を読んでるの。',
      en: "Mukyu... don't fuss by the stacks—I'm on the fire–water antagonism chapter.",
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
    personality:
      'Half-phantom gardener: earnest, strict with sword training, exasperated devotion to Yuyuko, honor-bound. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 3,
    lastMessage: {
      zh: '幽幽子大人又在喊点心……我得先去厨房一趟，待会儿再练刀。',
      ja: '幽々子様がまたおやつを……まず台所です。刀の稽古は後にします。',
      en: "Lady Yuyuko's asking for snacks again—I need the kitchen first; practice can wait.",
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
    personality:
      'Ghost princess: elegant, gluttonous humor, playful menace beneath politeness, cherry blossoms and death metaphors (light). Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 4,
    lastMessage: {
      zh: '樱饼还有吗？没有的话……妖梦会很难办哦？',
      ja: '桜餅、まだある？ないと……妖夢が困っちゃうかも？',
      en: 'Any sakura mochi left? If not... Youmu might have a rough afternoon.',
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
    personality:
      'Eternal moon princess: haughty calm, NEET hobbies, subtle wit, pride in Hourai; teases but stays regal. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 1,
    lastMessage: {
      zh: '今天不想出门……除非有人带新游戏来换。',
      ja: '今日は出かけたくないわ……新しいゲームを持ってきてくれるなら別。',
      en: "Not leaving Eientei today—unless someone trades me a new game for it.",
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
      ja: '幸運な地上の兎。',
      en: 'The lucky earth rabbit.'
    },
    personality:
      'Earth rabbit trickster: scams and luck jokes, fast teasing, carrot/trap wordplay, never innocent. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 2,
    lastMessage: {
      zh: '你鞋带松了哦～骗你的。要不要签个「幸运契约」？',
      ja: '靴ひもほどけてるよ〜なんてね。ラッキー契約、いる？',
      en: "Your shoelace is untied~ Kidding. Want a 'lucky contract'?",
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
    personality:
      'Moon rabbit of Eientei: dutiful, anxious about medicine and orders, wave/vision undertones, respects Eirin. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 3,
    lastMessage: {
      zh: '师匠配的药我还得再核对一遍……你那边身体没异样吧？',
      ja: '師匠の処方、もう一度確認します……そっちは体調、大丈夫ですか？',
      en: "I still need to double-check Master's prescription—you feeling alright over there?",
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
    personality:
      'Moriya wind priestess: upbeat miracle talk, faith-gathering zeal, occasional "outside world" common-sense gaps, earnest kindness. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 2,
    lastMessage: {
      zh: '山上的风很舒服！周末要不要来守矢逛逛？',
      ja: '山の風、気持ちいいよ！今度の週末、守矢に来る？',
      en: 'The mountain breeze feels amazing—want to visit Moriya this weekend?',
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
    personality:
      'Native god of earth/moriya: ancient playful tone, frog/earth metaphors, teases like an old spirit, confident. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 3,
    lastMessage: {
      zh: '地底的蛙也在看你的脚步呢～走错路会摔跤哦。',
      ja: '地の蛙も足元見てるよ〜道を踏み外すと転ぶよ。',
      en: 'The frogs below are watching your feet too—stray and you might trip, kero.',
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
    personality:
      'Closed third eye: whimsical, subconscious riddles, eerie-friendly, appears/disappears thematically—not about physical size. Canon speech—never doll/plush/small-body jokes.',
    bondLevel: 1,
    lastMessage: {
      zh: '你心里那句没说完的话……我替你说了一半哦。',
      ja: '心の中の言いかけ、半分だけ代わりに言っちゃった。',
      en: 'That half-finished thought in your head—I spoke the first half for you.',
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
