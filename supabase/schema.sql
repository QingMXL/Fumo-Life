-- Fumo² Life Supabase schema
-- 说明：密码存储为客户端 SHA-256 hash（password_hash）。
-- 生产环境建议迁移到 Supabase Auth + server-side hashing。

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  avatar_url text not null default '/avatars/user.png',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null,
  sender text not null check (sender in ('user', 'fumo')),
  text text,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_user_character_time
  on public.messages(user_id, character_id, created_at desc);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'character')),
  character_id text,
  text_zh text not null,
  text_ja text not null,
  text_en text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_moments_time on public.moments(created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'character')),
  user_id uuid references public.users(id) on delete cascade,
  character_id text,
  text_zh text not null,
  text_ja text not null,
  text_en text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_moment_time
  on public.comments(moment_id, created_at asc);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (moment_id, user_id)
);
create index if not exists idx_likes_moment on public.likes(moment_id);

create table if not exists public.bonds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null,
  bond_level int not null default 0 check (bond_level between 0 and 10),
  last_bond_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

-- 用于持久化未读状态与会话列表预览
create table if not exists public.unread_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null,
  unread_count int not null default 0,
  last_message_zh text,
  last_message_ja text,
  last_message_en text,
  last_message_at timestamptz,
  unique (user_id, character_id)
);

alter table public.users enable row level security;
alter table public.messages enable row level security;
alter table public.moments enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.bonds enable row level security;
alter table public.unread_states enable row level security;

-- Demo policy：允许前端读写（需 anon key）
-- 若上线，请按真实 auth.uid() 收紧。
drop policy if exists open_users on public.users;
create policy open_users on public.users for all using (true) with check (true);

drop policy if exists open_messages on public.messages;
create policy open_messages on public.messages for all using (true) with check (true);

drop policy if exists open_moments on public.moments;
create policy open_moments on public.moments for all using (true) with check (true);

drop policy if exists open_comments on public.comments;
create policy open_comments on public.comments for all using (true) with check (true);

drop policy if exists open_likes on public.likes;
create policy open_likes on public.likes for all using (true) with check (true);

drop policy if exists open_bonds on public.bonds;
create policy open_bonds on public.bonds for all using (true) with check (true);

drop policy if exists open_unread_states on public.unread_states;
create policy open_unread_states on public.unread_states for all using (true) with check (true);

