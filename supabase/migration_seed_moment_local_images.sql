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
