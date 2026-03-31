import { type Character, type Language, type Message, type Moment, type MomentComment } from '@/types';
import { supabase, isSupabaseReady } from './supabase';

type Unsub = () => void;

interface MessageRow {
  id: string;
  user_id: string;
  character_id: string;
  sender: 'user' | 'fumo';
  text: string | null;
  image_url: string | null;
  created_at: string;
}

interface MomentRow {
  id: string;
  user_id: string | null;
  author_type: 'user' | 'character';
  character_id: string | null;
  text_zh: string;
  text_ja: string;
  text_en: string;
  image_url: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  moment_id: string;
  author_type: 'user' | 'character';
  user_id: string | null;
  character_id: string | null;
  text_zh: string;
  text_ja: string;
  text_en: string;
  created_at: string;
}

interface LikeRow {
  moment_id: string;
  user_id: string;
}

interface UnreadRow {
  user_id: string;
  character_id: string;
  unread_count: number;
  last_message_zh: string | null;
  last_message_ja: string | null;
  last_message_en: string | null;
  last_message_at: string | null;
}

interface BondRow {
  character_id: string;
  bond_level: number;
  last_bond_at: string | null;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    characterId: row.character_id,
    sender: row.sender,
    text: row.text ?? '',
    imageUrl: row.image_url ?? undefined,
    timestamp: new Date(row.created_at),
  };
}

export async function fetchMessages(userId: string, characterId: string): Promise<Message[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, user_id, character_id, sender, text, image_url, created_at')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(toMessage);
}

export async function insertMessage(
  userId: string,
  payload: { characterId: string; sender: 'user' | 'fumo'; text?: string; imageUrl?: string }
) {
  if (!isSupabaseReady()) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: userId,
      character_id: payload.characterId,
      sender: payload.sender,
      text: payload.text ?? '',
      image_url: payload.imageUrl ?? null,
    })
    .select('id, user_id, character_id, sender, text, image_url, created_at')
    .single();
  if (error) throw error;
  return toMessage(data as MessageRow);
}

export function subscribeMessages(
  userId: string,
  characterId: string,
  onInsert: (m: Message) => void
): Unsub {
  if (!isSupabaseReady()) return () => {};
  const channel = supabase
    .channel(`messages:${userId}:${characterId}:${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${userId}`,
      },
      payload => {
        const row = payload.new as MessageRow;
        if (row.character_id !== characterId) return;
        onInsert(toMessage(row));
      }
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function saveUnreadState(
  userId: string,
  characterId: string,
  state: {
    unreadCount: number;
    lastMessageZh?: string;
    lastMessageJa?: string;
    lastMessageEn?: string;
    lastMessageAt?: number;
  }
) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase.from('unread_states').upsert(
    {
      user_id: userId,
      character_id: characterId,
      unread_count: Math.max(0, state.unreadCount),
      last_message_zh: state.lastMessageZh ?? null,
      last_message_ja: state.lastMessageJa ?? null,
      last_message_en: state.lastMessageEn ?? null,
      last_message_at: state.lastMessageAt ? new Date(state.lastMessageAt).toISOString() : null,
    },
    { onConflict: 'user_id,character_id' }
  );
  if (error) throw error;
}

export async function loadUnreadStates(userId: string) {
  if (!isSupabaseReady()) return new Map<string, UnreadRow>();
  const { data, error } = await supabase
    .from('unread_states')
    .select(
      'user_id, character_id, unread_count, last_message_zh, last_message_ja, last_message_en, last_message_at'
    )
    .eq('user_id', userId);
  if (error) throw error;
  const map = new Map<string, UnreadRow>();
  for (const row of (data ?? []) as UnreadRow[]) map.set(row.character_id, row);
  return map;
}

export async function upsertBond(userId: string, characterId: string, bondLevel: number, at: number) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase.from('bonds').upsert(
    {
      user_id: userId,
      character_id: characterId,
      bond_level: Math.max(0, Math.min(10, bondLevel)),
      last_bond_at: new Date(at).toISOString(),
    },
    { onConflict: 'user_id,character_id' }
  );
  if (error) throw error;
}

export async function loadBonds(userId: string) {
  if (!isSupabaseReady()) return new Map<string, BondRow>();
  const { data, error } = await supabase
    .from('bonds')
    .select('character_id, bond_level, last_bond_at')
    .eq('user_id', userId);
  if (error) throw error;
  const map = new Map<string, BondRow>();
  for (const row of (data ?? []) as BondRow[]) map.set(row.character_id, row);
  return map;
}

function momentFromRows(
  momentRows: MomentRow[],
  commentRows: CommentRow[],
  likeRows: LikeRow[],
  usersById: Map<string, { username: string; avatar_url: string | null }>
): Moment[] {
  const commentMap = new Map<string, MomentComment[]>();
  for (const c of commentRows) {
    const arr = commentMap.get(c.moment_id) ?? [];
    if (c.author_type === 'user') {
      const u = c.user_id ? usersById.get(c.user_id) : undefined;
      arr.push({
        id: c.id,
        authorType: 'user',
        userDisplayName: u?.username ?? '神社客',
        userAvatarUrl: u?.avatar_url ?? '/avatars/user.png',
        text: { zh: c.text_zh, ja: c.text_ja, en: c.text_en },
      });
    } else {
      arr.push({
        id: c.id,
        authorType: 'character',
        characterId: c.character_id ?? undefined,
        text: { zh: c.text_zh, ja: c.text_ja, en: c.text_en },
      });
    }
    commentMap.set(c.moment_id, arr);
  }

  const likesByMoment = likeRows.reduce<Record<string, number>>((acc, it) => {
    acc[it.moment_id] = (acc[it.moment_id] ?? 0) + 1;
    return acc;
  }, {});

  return momentRows.map(m => ({
    id: m.id,
    authorType: m.author_type,
    characterId: m.character_id ?? undefined,
    content: { zh: m.text_zh, ja: m.text_ja, en: m.text_en },
    imageUrl: m.image_url ?? undefined,
    timestamp: new Date(m.created_at),
    likes: likesByMoment[m.id] ?? 0,
    comments: (commentMap.get(m.id) ?? []).sort((a, b) => String(a.id).localeCompare(String(b.id))),
  }));
}

export async function ensureSeedCharacterMoments(seed: Moment[]) {
  if (!isSupabaseReady()) return;
  const { count, error } = await supabase
    .from('moments')
    .select('id', { count: 'exact', head: true })
    .eq('author_type', 'character');
  if (error) throw error;
  if ((count ?? 0) > 0) return;
  const rows = seed
    .filter(m => m.authorType === 'character')
    .map(m => ({
      author_type: 'character',
      character_id: m.characterId ?? null,
      text_zh: m.content.zh,
      text_ja: m.content.ja,
      text_en: m.content.en,
      image_url: m.imageUrl ?? null,
      created_at: m.timestamp.toISOString(),
    }));
  if (rows.length === 0) return;
  const { data, error: insertError } = await supabase.from('moments').insert(rows).select('id');
  if (insertError) throw insertError;
  const idRows = data ?? [];
  const comments: Array<{
    moment_id: string;
    author_type: 'character';
    character_id: string | null;
    text_zh: string;
    text_ja: string;
    text_en: string;
    created_at: string;
  }> = [];
  const likes: Array<{ moment_id: string; user_id: string }> = [];
  seed
    .filter(m => m.authorType === 'character')
    .forEach((m, i) => {
      const inserted = idRows[i] as { id: string } | undefined;
      if (!inserted) return;
      for (const c of m.comments) {
        if (c.authorType !== 'character') continue;
        comments.push({
          moment_id: inserted.id,
          author_type: 'character',
          character_id: c.characterId ?? null,
          text_zh: c.text.zh,
          text_ja: c.text.ja,
          text_en: c.text.en,
          created_at: new Date().toISOString(),
        });
      }
      // 预热点赞数量：使用虚拟用户占位会污染 users，不做硬写入；由实际点赞累积。
      void likes;
    });
  if (comments.length) {
    const { error: cErr } = await supabase.from('comments').insert(comments);
    if (cErr) throw cErr;
  }
}

export async function fetchMomentsFeed(userId: string) {
  if (!isSupabaseReady()) return { moments: [] as Moment[], likedMomentIds: new Set<string>() };
  const { data: momentsRaw, error: mErr } = await supabase
    .from('moments')
    .select(
      'id, user_id, author_type, character_id, text_zh, text_ja, text_en, image_url, created_at'
    )
    .order('created_at', { ascending: false });
  if (mErr) throw mErr;
  const momentRows = (momentsRaw ?? []) as MomentRow[];
  const ids = momentRows.map(m => m.id);
  if (ids.length === 0) return { moments: [] as Moment[], likedMomentIds: new Set<string>() };

  const [{ data: commentsRaw, error: cErr }, { data: likesRaw, error: lErr }] = await Promise.all([
    supabase
      .from('comments')
      .select('id, moment_id, author_type, user_id, character_id, text_zh, text_ja, text_en, created_at')
      .in('moment_id', ids)
      .order('created_at', { ascending: true }),
    supabase.from('likes').select('moment_id, user_id').in('moment_id', ids),
  ]);
  if (cErr) throw cErr;
  if (lErr) throw lErr;

  const userIds = new Set<string>();
  for (const m of momentRows) if (m.author_type === 'user' && m.user_id) userIds.add(m.user_id);
  for (const c of (commentsRaw ?? []) as CommentRow[]) if (c.author_type === 'user' && c.user_id) userIds.add(c.user_id);
  let usersById = new Map<string, { username: string; avatar_url: string | null }>();
  if (userIds.size > 0) {
    const { data: usersRaw } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', Array.from(userIds));
    usersById = new Map(
      ((usersRaw ?? []) as Array<{ id: string; username: string; avatar_url: string | null }>).map(u => [
        u.id,
        { username: u.username, avatar_url: u.avatar_url },
      ])
    );
  }

  const moments = momentFromRows(
    momentRows,
    (commentsRaw ?? []) as CommentRow[],
    (likesRaw ?? []) as LikeRow[],
    usersById
  );
  const likedMomentIds = new Set(
    ((likesRaw ?? []) as LikeRow[]).filter(it => it.user_id === userId).map(it => it.moment_id)
  );
  return { moments, likedMomentIds };
}

export async function createUserMoment(
  userId: string,
  payload: { content: { zh: string; ja: string; en: string }; imageUrl?: string }
) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase.from('moments').insert({
    user_id: userId,
    author_type: 'user',
    text_zh: payload.content.zh,
    text_ja: payload.content.ja,
    text_en: payload.content.en,
    image_url: payload.imageUrl ?? null,
  });
  if (error) throw error;
}

export async function createCharacterComment(momentId: string, c: MomentComment) {
  if (!isSupabaseReady() || c.authorType !== 'character') return;
  const { error } = await supabase.from('comments').insert({
    moment_id: momentId,
    author_type: 'character',
    character_id: c.characterId ?? null,
    text_zh: c.text.zh,
    text_ja: c.text.ja,
    text_en: c.text.en,
  });
  if (error) throw error;
}

export async function createUserComment(
  userId: string,
  momentId: string,
  text: { zh: string; ja: string; en: string }
) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase.from('comments').insert({
    moment_id: momentId,
    author_type: 'user',
    user_id: userId,
    text_zh: text.zh,
    text_ja: text.ja,
    text_en: text.en,
  });
  if (error) throw error;
}

export async function setLike(userId: string, momentId: string, shouldLike: boolean) {
  if (!isSupabaseReady()) return;
  if (shouldLike) {
    const { error } = await supabase.from('likes').insert({ user_id: userId, moment_id: momentId });
    if (error && error.code !== '23505') throw error;
    return;
  }
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('moment_id', momentId);
  if (error) throw error;
}

export function subscribeMomentsRefresh(onRefresh: () => void): Unsub {
  if (!isSupabaseReady()) return () => {};
  const channel = supabase
    .channel(`moments-refresh:${Math.random().toString(36).slice(2, 7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'moments' }, onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, onRefresh)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function withCharacterCloudState(
  characters: Character[],
  unreadMap: Map<string, UnreadRow>,
  bondMap: Map<string, BondRow>
) {
  return characters.map(c => {
    const unread = unreadMap.get(c.id);
    const bond = bondMap.get(c.id);
    const at = unread?.last_message_at ? new Date(unread.last_message_at).getTime() : c.lastMessageAt;
    return {
      ...c,
      unreadCount: unread?.unread_count ?? c.unreadCount,
      lastMessage: unread
        ? {
            zh: unread.last_message_zh ?? c.lastMessage?.zh ?? '',
            ja: unread.last_message_ja ?? c.lastMessage?.ja ?? '',
            en: unread.last_message_en ?? c.lastMessage?.en ?? '',
          }
        : c.lastMessage,
      lastMessageAt: at,
      lastTime: at ? new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : c.lastTime,
      bondLevel: bond?.bond_level ?? c.bondLevel,
      lastBondAt: bond?.last_bond_at ? new Date(bond.last_bond_at).getTime() : c.lastBondAt,
    };
  });
}

export function mapPreviewByLanguage(language: Language, text: string) {
  return {
    zh: language === 'zh' ? text : '',
    ja: language === 'ja' ? text : '',
    en: language === 'en' ? text : '',
  };
}

export async function updateCloudUserProfile(userId: string, profile: { username: string; avatarUrl: string }) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase
    .from('users')
    .update({ username: profile.username, avatar_url: profile.avatarUrl })
    .eq('id', userId);
  if (error) throw error;
}

