-- 已有项目追加：角色互赞表（与 schema.sql 中段落一致）
create table if not exists public.character_likes (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  character_id text not null,
  created_at timestamptz not null default now(),
  unique (moment_id, character_id)
);
create index if not exists idx_character_likes_moment on public.character_likes(moment_id);

alter table public.character_likes enable row level security;
drop policy if exists open_character_likes on public.character_likes;
create policy open_character_likes on public.character_likes for all using (true) with check (true);
