import { supabase, isSupabaseReady } from './supabase';

const AUTH_SESSION_KEY = 'fumo-auth-user-id';

export interface AppUser {
  id: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeUsername(username: string) {
  const t = username.trim();
  return t.length > 0 ? t : '神社客';
}

export async function registerWithUsername(username: string, password: string): Promise<AppUser> {
  if (!isSupabaseReady()) throw new Error('Supabase 未配置');
  const cleanName = normalizeUsername(username);
  if (!password.trim()) throw new Error('密码不能为空');
  const passwordHash = await sha256(password);

  const { data, error } = await supabase
    .from('users')
    .insert({
      username: cleanName,
      password_hash: passwordHash,
      avatar_url: '/avatars/user.png',
    })
    .select('id, username, avatar_url, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('用户名已存在');
    throw error;
  }

  const user: AppUser = {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url ?? '/avatars/user.png',
    createdAt: data.created_at,
  };
  localStorage.setItem(AUTH_SESSION_KEY, user.id);
  return user;
}

export async function loginWithUsername(username: string, password: string): Promise<AppUser> {
  if (!isSupabaseReady()) throw new Error('Supabase 未配置');
  const cleanName = normalizeUsername(username);
  if (!password.trim()) throw new Error('密码不能为空');
  const passwordHash = await sha256(password);

  const { data, error } = await supabase
    .from('users')
    .select('id, username, password_hash, avatar_url, created_at')
    .eq('username', cleanName)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.password_hash !== passwordHash) {
    throw new Error('用户名或密码错误');
  }

  const user: AppUser = {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url ?? '/avatars/user.png',
    createdAt: data.created_at,
  };
  localStorage.setItem(AUTH_SESSION_KEY, user.id);
  return user;
}

export async function restoreAuthUser(): Promise<AppUser | null> {
  if (!isSupabaseReady()) return null;
  const userId = localStorage.getItem(AUTH_SESSION_KEY);
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url ?? '/avatars/user.png',
    createdAt: data.created_at,
  };
}

export function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

