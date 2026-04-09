-- Moments 点赞基数：用于展示“初始热度 + 用户点赞”
alter table public.moments
add column if not exists base_likes int not null default 12;

-- 给历史数据填充可区分的稳定基数（12-48）
update public.moments
set base_likes = 12 + (abs(hashtext(id::text)) % 37)
where base_likes is null or base_likes < 0;
