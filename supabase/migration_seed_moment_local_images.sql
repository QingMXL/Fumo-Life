-- Sync seed character moment images (paths under site /public/moments/).
-- Run in Supabase SQL Editor after deploying static files so /moments/*.png resolve on your domain.
-- Paths are root-relative; the app prepends Vite BASE_URL when needed.

UPDATE public.moments
SET image_url = '/moments/reimu-shrine-moment.png'
WHERE author_type = 'character'
  AND character_id = 'reimu'
  AND text_zh = '今天神社也很清闲呢，要是有人来塞钱就好了...（瘫倒在垫子上）';

UPDATE public.moments
SET image_url = '/moments/remilia-moment.png'
WHERE author_type = 'character'
  AND character_id = 'remilia'
  AND text_zh = '月圆前夜的红茶要浓一点——这样才配得上窗外的云层。';

UPDATE public.moments
SET image_url = '/moments/suwako-lake-moment.png'
WHERE author_type = 'character'
  AND character_id = 'suwako'
  AND text_zh = '湖里摸到了凉丝丝的鹅卵石——送给早苗当镇纸，她说像冷冻团子。';
