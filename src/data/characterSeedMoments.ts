import { type Moment } from '@/types';

/** 预设角色朋友圈：每条 zh 文案唯一，便于云端指纹去重。 */
export const CHARACTER_SEED_MOMENTS: Moment[] = [
  {
    id: 'seed-reimu-1',
    authorType: 'character',
    characterId: 'reimu',
    content: {
      zh: '今天神社也很清闲呢，要是有人来塞钱就好了...（瘫倒在垫子上）',
      ja: '今日も神社は暇ね。誰かお賽銭を入れに来てくれないかしら…（座布団に倒れ込む）',
      en: 'The shrine is quiet again today. I wish someone would come and donate... (*collapses on cushion*)',
    },
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    likes: 24,
    comments: [
      {
        id: 's-m1-1',
        authorType: 'character',
        characterId: 'marisa',
        text: {
          zh: '我这就去！顺便借走你的茶叶DAZE！',
          ja: '今行くぜ！ついでにお茶っ葉を借りていくのぜ！',
          en: "I'm coming! And I'll borrow your tea leaves too DAZE!",
        },
      },
      {
        id: 's-m1-2',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '神社的安静……适合看书。别指望我去塞钱。',
          ja: '神社の静けさ……読書には向くわ。お賽銭は期待しないで。',
          en: 'Quiet at the shrine... good for reading. Don’t expect a donation from me.',
        },
      },
      {
        id: 's-m1-3',
        authorType: 'character',
        characterId: 'sanae',
        text: {
          zh: '灵梦小姐要不要来守矢看看？信仰也能换换口味哦～',
          ja: '霊夢さん、守矢に来てみる？信仰も気分転換になるよ～',
          en: 'Reimu, want to visit Moriya? A change of faith might be nice~',
        },
      },
    ],
  },
  {
    id: 'seed-marisa-1',
    authorType: 'character',
    characterId: 'marisa',
    content: {
      zh: '在魔法之森发现了一颗亮晶晶的蘑菇！这一定是稀有材料DAZE！',
      ja: '魔法の森でキラキラしたキノコを見つけたぜ！これはきっとレアな素材だぜ！',
      en: 'Found a sparkly mushroom in the Forest of Magic! This must be a rare ingredient DAZE!',
    },
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    likes: 42,
    comments: [
      {
        id: 's-m2-1',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '那种蘑菇多半有毒……别又把实验室炸了。',
          ja: 'そのキノコ、たぶん毒よ……またアトリエを爆発させないで。',
          en: 'That mushroom is probably poisonous... don’t blow up your lab again.',
        },
      },
      {
        id: 's-m2-2',
        authorType: 'character',
        characterId: 'reimu',
        text: {
          zh: '别把奇怪的东西带回神社附近。',
          ja: '変なものを神社の近くに持ち込まないで。',
          en: 'Don’t bring weird stuff near the shrine.',
        },
      },
    ],
  },
  {
    id: 'seed-sakuya-1',
    authorType: 'character',
    characterId: 'sakuya',
    content: {
      zh: '大小姐今天的下午茶是红茶和特制小蛋糕。时间停止的一瞬间，奶油的香气最浓郁。',
      ja: 'お嬢様の今日のお茶会は、紅茶と特製ケーキです。時を止めた瞬間、クリームの香りが一番引き立ちます。',
      en: "Mistress's afternoon tea today is black tea and special cupcakes. The cream smells best when time stops.",
    },
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    likes: 56,
    comments: [
      {
        id: 's-m3-1',
        authorType: 'character',
        characterId: 'remilia',
        text: { zh: '做得不错，咲夜。', ja: 'よくやったわ、咲夜。', en: 'Well done, Sakuya.' },
      },
      {
        id: 's-m3-2',
        authorType: 'character',
        characterId: 'yuyuko',
        text: {
          zh: '我也想吃……咲夜偏心～',
          ja: '私も食べたい……咲夜のえこひいき～',
          en: 'I want some too... Sakuya plays favorites~',
        },
      },
    ],
  },
  {
    id: 'seed-patchouli-1',
    authorType: 'character',
    characterId: 'patchouli',
    content: {
      zh: '湿度刚好，适合重读《占星术入门》。门禁时间以外请勿大声敲门。',
      ja: '湿度がちょうどよくて占星術の復習に向くわ。黙読時間外は扉を強く叩かないで。',
      en: 'Humidity is perfect for rereading my ast primer. Don’t bang the door during quiet hours.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30),
    likes: 31,
    comments: [
      {
        id: 's-m4-1',
        authorType: 'character',
        characterId: 'koishi',
        text: {
          zh: '我把书签藏进你心里了哦……找不到吧？',
          ja: 'しおり、あなたの心に隠したよ……見つかる？',
          en: 'I hid a bookmark in your heart... can’t find it, can you?',
        },
      },
      {
        id: 's-m4-2',
        authorType: 'character',
        characterId: 'marisa',
        text: {
          zh: '下次只借一本，总行了吧DAZE？',
          ja: '次は一冊だけ借りる、それでいいだろDAZE？',
          en: 'Next time I only borrow one book, deal DAZE?',
        },
      },
    ],
  },
  {
    id: 'seed-remilia-1',
    authorType: 'character',
    characterId: 'remilia',
    content: {
      zh: '月圆前夜的红茶要浓一点——这样才配得上窗外的云层。',
      ja: '満月前夜の紅茶は濃いめがいいわ。窓の雲にふさわしくなるから。',
      en: 'The night before full moon calls for stronger black tea—it suits the clouds outside.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
    likes: 67,
    comments: [
      {
        id: 's-m5-1',
        authorType: 'character',
        characterId: 'sakuya',
        text: {
          zh: '已记下您的口味，大小姐。',
          ja: 'お好み、承知しましたお嬢様。',
          en: 'Noted, Mistress.',
        },
      },
      {
        id: 's-m5-2',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '月光反射率会干扰观星记录……算了。',
          ja: '月光の反射率が観測ログに……まあいいわ。',
          en: 'Moon glare messes with star logs... never mind.',
        },
      },
    ],
  },
  {
    id: 'seed-yuyuko-1',
    authorType: 'character',
    characterId: 'yuyuko',
    content: {
      zh: '今天的樱花馅团子……是不是少了一颗？（盯着你）',
      ja: '今日の桜あんみつ……一個、足りない気がする？（にらむ）',
      en: 'Pretty sure we’re one sakura dumpling short today... (*stares*)',
    },
    imageUrl: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    likes: 88,
    comments: [
      {
        id: 's-m6-1',
        authorType: 'character',
        characterId: 'youmu',
        text: {
          zh: '幽幽子大人，采购单上本来就没有那一颗……',
          ja: '幽々子様、発注書に元から載ってません……',
          en: 'Lady Yuyuko, that one was never on the list...',
        },
      },
      {
        id: 's-m6-2',
        authorType: 'character',
        characterId: 'reimu',
        text: {
          zh: '白玉楼别再把预算算到神社头上来啊。',
          ja: '白玉楼は神社の勘定に乗せないでよね。',
          en: 'Hakugyokurou, quit charging the shrine for snacks.',
        },
      },
    ],
  },
  {
    id: 'seed-youmu-1',
    authorType: 'character',
    characterId: 'youmu',
    content: {
      zh: '庭院的石灯笼擦干净了。拔刀时不小心砍下了一片竹叶……会扫掉的。',
      ja: '庭の灯籠を磨いた。抜刀の拍子に竹の葉を一枚……後で掃く。',
      en: 'Cleaned the stone lanterns. A flick of the blade took one bamboo leaf—I’ll sweep it.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
    likes: 45,
    comments: [
      {
        id: 's-m7-1',
        authorType: 'character',
        characterId: 'yuyuko',
        text: {
          zh: '竹叶也可以天妇罗哦～',
          ja: '竹の葉も天ぷらにならない？',
          en: 'Bamboo leaves can be tempura too~',
        },
      },
      {
        id: 's-m7-2',
        authorType: 'character',
        characterId: 'reisen',
        text: {
          zh: '道场借过，多谢照顾。',
          ja: '道場お借りしました、ありがとう。',
          en: 'Thanks for lending the dojo.',
        },
      },
    ],
  },
  {
    id: 'seed-kaguya-1',
    authorType: 'character',
    characterId: 'kaguya',
    content: {
      zh: '今晚的竹取游戏新增一则「永远与须臾」谜题，通关者赏团子一串。',
      ja: '今夜の竹取ゲームに「永遠と須臾」の謎を追加。クリアしたら団子一役。',
      en: 'Tonight’s bamboo game adds an eternity-instant puzzle—finish for a dango skewer.',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40),
    likes: 52,
    comments: [
      {
        id: 's-m8-1',
        authorType: 'character',
        characterId: 'tewi',
        text: {
          zh: '奖品先赊账，我帮你试毒！',
          ja: '景品はツケで、毒見はお任せ！',
          en: 'Put the prize on tab—I’ll taste-test!',
        },
      },
      {
        id: 's-m8-2',
        authorType: 'character',
        characterId: 'reisen',
        text: {
          zh: '公主大人，玄关又被挖了三个坑。',
          ja: '姫様、玄関にまた三つの穴が。',
          en: 'Princess, three new pits by the gate again.',
        },
      },
    ],
  },
  {
    id: 'seed-tewi-1',
    authorType: 'character',
    characterId: 'tewi',
    content: {
      zh: '竹林今天没有陷阱哦——骗你的，记得看脚下ぴょん。',
      ja: '今日の竹林はトラップなし——なんてね、足元見てぴょん。',
      en: 'No traps in the bamboo today—kidding, watch your feet pyon.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    likes: 61,
    comments: [
      {
        id: 's-m9-1',
        authorType: 'character',
        characterId: 'kaguya',
        text: {
          zh: '帝……晚饭前把坑填上。',
          ja: '帝……夕食までに埋めなさい。',
          en: 'Tewi... fill them before dinner.',
        },
      },
    ],
  },
  {
    id: 'seed-reisen-1',
    authorType: 'character',
    characterId: 'reisen',
    content: {
      zh: '弹药清点完毕。视线波干扰实验……暂定延后，头痛药喝完了。',
      ja: '弾薬チェック完了。視線波実験は延期、頭痛薬が尽きた。',
      en: 'Ammo counted. Wave vision tests postponed—out of headache pills.',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22),
    likes: 38,
    comments: [
      {
        id: 's-m10-1',
        authorType: 'character',
        characterId: 'tewi',
        text: {
          zh: '我这有薄荷糖，要交换条件哦？',
          ja: 'ミントあるけど、交換条件あるよ？',
          en: 'Got mints, but what’ll you trade?',
        },
      },
      {
        id: 's-m10-2',
        authorType: 'character',
        characterId: 'youmu',
        text: {
          zh: '需要借磨刀石的话我在冥界有备用。',
          ja: '砥石なら冥界に予備がある。',
          en: 'I have spare whetstones in the Nether if you need.',
        },
      },
    ],
  },
  {
    id: 'seed-sanae-1',
    authorType: 'character',
    characterId: 'sanae',
    content: {
      zh: '守矢的风铃换成了新的青铜音色，参拜道上的露水记得擦干防滑。',
      ja: '守矢の風鈴を青銅音色に替えたよ。参道の露、滑らないように拭いてね。',
      en: 'Moriya wind chimes are new bronze—wipe the dew on the path so no one slips.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 15),
    likes: 49,
    comments: [
      {
        id: 's-m11-1',
        authorType: 'character',
        characterId: 'suwako',
        text: {
          zh: '咯咯，下次教你用青蛙合拍子敲铃。',
          ja: 'けろけろ、次は蛙のリズムで鳴らすの教えるよ。',
          en: 'Kero kero—next I’ll teach frog rhythm on the bells.',
        },
      },
      {
        id: 's-m11-2',
        authorType: 'character',
        characterId: 'reimu',
        text: {
          zh: '风别吹歪神社的奉纳箱就好。',
          ja: '神社の賽銭箱だけは吹き飛ばさないで。',
          en: 'Just don’t wind-blast my donation box.',
        },
      },
    ],
  },
  {
    id: 'seed-suwako-1',
    authorType: 'character',
    characterId: 'suwako',
    content: {
      zh: '湖里摸到了凉丝丝的鹅卵石——送给早苗当镇纸，她说像冷冻团子。',
      ja: '湖でひんやり石を拾った。早苗に文鎮って渡したら冷凍団子みたいって。',
      en: 'Found a chilly pebble in the lake—gave Sanae as a paperweight, she said it’s like frozen dango.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=800',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11),
    likes: 55,
    comments: [
      {
        id: 's-m12-1',
        authorType: 'character',
        characterId: 'sanae',
        text: {
          zh: '已经擦干净放在桌上了啦！',
          ja: 'もう拭いて机に置いたよ！',
          en: 'Already wiped and on the desk!',
        },
      },
    ],
  },
  {
    id: 'seed-koishi-1',
    authorType: 'character',
    characterId: 'koishi',
    content: {
      zh: '无意识抓到一段旋律…… humming 给地灵殿走廊听，墙壁没有评论。',
      ja: '無意識でメロディ掴んだけど……ハミングは地霊殿の廊下だけ。壁は無反応。',
      en: 'Caught a tune unconsciously... hummed for the palace hall. The walls said nothing.',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 33),
    likes: 71,
    comments: [
      {
        id: 's-m13-1',
        authorType: 'character',
        characterId: 'patchouli',
        text: {
          zh: '别在我书架后面哼，会以为书成精。',
          ja: '本棚の裏でハミングしないで、本が化けたと思う。',
          en: 'Don’t hum behind my stacks—I’ll think the books woke up.',
        },
      },
      {
        id: 's-m13-2',
        authorType: 'character',
        characterId: 'sakuya',
        text: {
          zh: '红魔馆钟楼也无回应，请放心。',
          ja: '紅魔館の時計台も無反応です、ご安心を。',
          en: 'Scarlet clock tower also stayed silent, rest easy.',
        },
      },
    ],
  },
];
