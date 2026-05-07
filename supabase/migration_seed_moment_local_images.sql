-- Optional one-shot fixes (legacy paths). Prefer syncing via the app:
-- Deploy static files under public/moments/{seed id}.png, open Discover — ensureSeedCharacterMoments patches image_url.

UPDATE public.moments
SET image_url = '/moments/seed-reimu-1.png'
WHERE author_type = 'character'
  AND character_id = 'reimu'
  AND text_zh = '今天神社也很清闲呢，要是有人来塞钱就好了...（瘫倒在垫子上）';

UPDATE public.moments
SET image_url = '/moments/seed-remilia-1.png'
WHERE author_type = 'character'
  AND character_id = 'remilia'
  AND text_zh = '月圆前夜的红茶要浓一点——这样才配得上窗外的云层。';

UPDATE public.moments
SET image_url = '/moments/seed-suwako-1.png'
WHERE author_type = 'character'
  AND character_id = 'suwako'
  AND text_zh = '湖里摸到了凉丝丝的鹅卵石——送给早苗当镇纸，她说像冷冻团子。';

-- 纯文字种子动态（无配图）
UPDATE public.moments SET image_url = NULL
WHERE author_type = 'character' AND character_id = 'kaguya'
  AND text_zh = '今晚的竹取游戏新增一则「永远与须臾」谜题，通关者赏团子一串。';
UPDATE public.moments SET image_url = NULL
WHERE author_type = 'character' AND character_id = 'reisen'
  AND text_zh = '弹药清点完毕。视线波干扰实验……暂定延后，头痛药喝完了。';
UPDATE public.moments SET image_url = NULL
WHERE author_type = 'character' AND character_id = 'koishi'
  AND text_zh = '无意识抓到一段旋律…… humming 给地灵殿走廊听，墙壁没有评论。';
