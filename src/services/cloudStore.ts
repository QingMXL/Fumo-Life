import {
  CHARACTERS,
  type Character,
  type Language,
  type Message,
  type Moment,
  type MomentComment,
} from '@/types';
import { CHARACTER_SEED_TEXT_ONLY_KEYS } from '@/data/characterSeedMoments';
import { generateFumoSceneImage } from './gemini';
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
  base_likes?: number | null;
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

interface CharacterLikeRow {
  moment_id: string;
  character_id: string;
}

function fallbackLikeBase(seed: string): number {
  // 12-48 区间，保证每条动态基数不同且稳定。
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return 12 + (h % 37);
}

function randomLikeBase() {
  return 12 + Math.floor(Math.random() * 37);
}

/**
 * 动态去重键：同一「作者」下相同中文只保留一条（避免不同角色/用户因撞文案被错误合并导致配图丢失）。
 * - 角色：character_id + text_zh
 * - 用户：user_id + text_zh
 */
function momentContentDedupeKey(row: MomentRow): string {
  const zh = row.text_zh.trim();
  if (row.author_type === 'user') return `u:${row.user_id ?? ''}|${zh}`;
  return `c:${row.character_id ?? ''}|${zh}`;
}

/** 去重打分：用户动态优先；有图优先；非 Unsplash 等占位图优先；较新略优先（小数 tie-break）。 */
function momentRowDedupePriority(row: MomentRow): number {
  const img = row.image_url?.trim() ?? '';
  const stock = /images\.unsplash\.com|picsum\.photos|placehold|placeholder\.com/i.test(img);
  const t = new Date(row.created_at).getTime();
  let p = 0;
  if (row.author_type === 'user') p += 4_000_000_000;
  if (img) p += 2_000_000_000;
  if (img && !stock) p += 1_000_000_000;
  return p + t / 86_400_000;
}

/** 合并「正文相同」的动态，只保留一条展示。 */
function dedupeMomentRowsByContent(rows: MomentRow[]): MomentRow[] {
  const best = new Map<string, MomentRow>();
  for (const r of rows) {
    const k = momentContentDedupeKey(r);
    const cur = best.get(k);
    if (!cur || momentRowDedupePriority(r) > momentRowDedupePriority(cur)) best.set(k, r);
  }
  return [...best.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** 合并展示后，把重复行的 id 映射到 canonical id，评论/赞归并到保留条上。 */
function buildMomentIdToCanonical(allRaw: MomentRow[], canonicalRows: MomentRow[]): Map<string, string> {
  const winByKey = new Map<string, string>();
  for (const r of canonicalRows) {
    winByKey.set(momentContentDedupeKey(r), r.id);
  }
  const out = new Map<string, string>();
  for (const r of allRaw) {
    out.set(r.id, winByKey.get(momentContentDedupeKey(r)) ?? r.id);
  }
  return out;
}

function remapCommentMomentIds(rows: CommentRow[], canon: Map<string, string>): CommentRow[] {
  return rows.map(r => ({
    ...r,
    moment_id: canon.get(r.moment_id) ?? r.moment_id,
  }));
}

/** 合并重复动态后，同一评论会被折叠到同一个 moment_id，这里按签名去重。 */
function dedupComments(rows: CommentRow[]): CommentRow[] {
  const seen = new Set<string>();
  const out: CommentRow[] = [];
  for (const r of rows) {
    const sig = [
      r.moment_id,
      r.author_type,
      r.user_id ?? '',
      r.character_id ?? '',
      r.text_zh,
      r.text_ja,
      r.text_en,
    ].join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(r);
  }
  return out;
}

function remapUserLikes(rows: LikeRow[], canon: Map<string, string>): LikeRow[] {
  return rows.map(r => ({
    ...r,
    moment_id: canon.get(r.moment_id) ?? r.moment_id,
  }));
}

function dedupUserLikes(rows: LikeRow[]): LikeRow[] {
  const seen = new Set<string>();
  const out: LikeRow[] = [];
  for (const r of rows) {
    const k = `${r.moment_id}:${r.user_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function remapCharLikes(rows: CharacterLikeRow[], canon: Map<string, string>): CharacterLikeRow[] {
  return rows.map(r => ({
    ...r,
    moment_id: canon.get(r.moment_id) ?? r.moment_id,
  }));
}

function dedupCharLikes(rows: CharacterLikeRow[]): CharacterLikeRow[] {
  const seen = new Set<string>();
  const out: CharacterLikeRow[] = [];
  for (const r of rows) {
    const k = `${r.moment_id}:${r.character_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** 逐条插入，避免一条唯一冲突导致整批失败、其它赞落库。 */
async function insertCharacterLikesIgnoreDup(rows: Array<{ moment_id: string; character_id: string }>) {
  if (rows.length === 0) return;
  await Promise.all(
    rows.map(async row => {
      const { error } = await supabase.from('character_likes').insert(row);
      if (error && error.code !== '23505') {
        // eslint-disable-next-line no-console
        console.warn('[cloudStore] character_likes insert:', error.message);
      }
    })
  );
}

/** 依 momentId 在候选池里稳定挑选互赞角色。 */
function pickLikersFromPool(momentId: string, pool: string[], want: number): string[] {
  let h = 0;
  for (let i = 0; i < momentId.length; i++) h = (h * 31 + momentId.charCodeAt(i)) >>> 0;
  const scored = pool.map(id => ({
    id,
    s: (h ^ id.split('').reduce((x, ch) => x + ch.charCodeAt(0), 0)) >>> 0,
  }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, Math.min(want, scored.length)).map(x => x.id);
}

async function ensureNpcCrossLikesForFeed(
  momentRows: MomentRow[],
  allRaw: MomentRow[],
  idCanon: Map<string, string>
) {
  if (!isSupabaseReady()) return;
  const charMoments = momentRows.filter(m => m.author_type === 'character' && m.character_id);
  if (charMoments.length === 0) return;

  const physicalIds = [...new Set(allRaw.map(m => m.id))];
  if (physicalIds.length === 0) return;
  const { data: existingLikes, error: exErr } = await supabase
    .from('character_likes')
    .select('moment_id, character_id')
    .in('moment_id', physicalIds);
  if (exErr) {
    // eslint-disable-next-line no-console
    console.warn('[cloudStore] character_likes 读取失败（若旧库无此表请先执行 schema）:', exErr.message);
    return;
  }

  const authorByCanon = new Map(charMoments.map(m => [m.id, m.character_id!]));
  const haveByCanon = new Map<string, Set<string>>();
  for (const row of (existingLikes ?? []) as CharacterLikeRow[]) {
    if (!row.character_id) continue;
    const canon = idCanon.get(row.moment_id) ?? row.moment_id;
    const author = authorByCanon.get(canon);
    if (author && row.character_id === author) continue;
    const s = haveByCanon.get(canon) ?? new Set();
    s.add(row.character_id);
    haveByCanon.set(canon, s);
  }

  const maxNpc = Math.max(0, CHARACTERS.length - 1);
  const minTarget = Math.min(6, maxNpc);
  const toInsert: Array<{ moment_id: string; character_id: string }> = [];

  for (const m of charMoments) {
    const author = m.character_id!;
    const have = haveByCanon.get(m.id) ?? new Set();
    const need = Math.max(0, minTarget - have.size);
    if (need === 0) continue;
    const candidates = CHARACTERS.map(c => c.id).filter(id => id !== author && !have.has(id));
    const picked = pickLikersFromPool(m.id, candidates, need);
    for (const pid of picked) {
      toInsert.push({ moment_id: m.id, character_id: pid });
      have.add(pid);
    }
    haveByCanon.set(m.id, have);
  }
  await insertCharacterLikesIgnoreDup(toInsert);
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

/**
 * 仅删除“当前用户自己发送”的消息。
 * 用于撤回/删除：二者在当前产品规则下都为不可恢复的硬删除。
 */
export async function deleteUserMessage(userId: string, messageId: string, characterId: string) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .eq('sender', 'user');
  if (error) throw error;
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
  charLikeRows: CharacterLikeRow[],
  usersById: Map<string, { username: string; avatar_url: string | null }>
): Moment[] {
  const commentMap = new Map<string, MomentComment[]>();
  for (const c of commentRows) {
    const arr = commentMap.get(c.moment_id) ?? [];
    const createdAt = new Date(c.created_at);
    if (c.author_type === 'user') {
      const u = c.user_id ? usersById.get(c.user_id) : undefined;
      arr.push({
        id: c.id,
        authorType: 'user',
        userId: c.user_id ?? undefined,
        userDisplayName: u?.username ?? '神社客',
        userAvatarUrl: u?.avatar_url ?? '/avatars/user.png',
        createdAt,
        text: { zh: c.text_zh, ja: c.text_ja, en: c.text_en },
      });
    } else {
      arr.push({
        id: c.id,
        authorType: 'character',
        characterId: c.character_id ?? undefined,
        createdAt,
        text: { zh: c.text_zh, ja: c.text_ja, en: c.text_en },
      });
    }
    commentMap.set(c.moment_id, arr);
  }

  const userLikesByMoment = likeRows.reduce<Record<string, number>>((acc, it) => {
    acc[it.moment_id] = (acc[it.moment_id] ?? 0) + 1;
    return acc;
  }, {});

  const charLikersByMoment = new Map<string, string[]>();
  for (const it of charLikeRows) {
    if (!it.character_id) continue;
    const arr = charLikersByMoment.get(it.moment_id) ?? [];
    arr.push(it.character_id);
    charLikersByMoment.set(it.moment_id, arr);
  }

  return momentRows.map(m => {
    const raw = charLikersByMoment.get(m.id) ?? [];
    const author = m.character_id ?? '';
    const npc = [...new Set(raw.filter(cid => cid && cid !== author))].sort((a, b) =>
      a.localeCompare(b)
    );
    const nu = userLikesByMoment[m.id] ?? 0;
    const base = typeof m.base_likes === 'number' ? m.base_likes : fallbackLikeBase(m.id);
    return {
      id: m.id,
      authorType: m.author_type,
      characterId: m.character_id ?? undefined,
      content: { zh: m.text_zh, ja: m.text_ja, en: m.text_en },
      imageUrl: m.image_url ?? undefined,
      timestamp: new Date(m.created_at),
      // 展示规则：随机基数 + 用户点赞；角色互赞保留为头像展示。
      likes: base + nu,
      likedByCharacters: npc.length ? npc : undefined,
      comments: (commentMap.get(m.id) ?? []).sort(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      ),
    };
  });
}

/** 角色种子动态去重键（不含图片）：换图时更新库内 image_url，不重复插入。 */
function seedIdentityKey(m: Moment): string {
  if (m.authorType !== 'character') return '';
  return `${m.characterId ?? ''}|${m.content.zh}`;
}

export async function ensureSeedCharacterMoments(seed: Moment[]) {
  if (!isSupabaseReady()) return;
  const { data: existing, error } = await supabase
    .from('moments')
    .select('id, character_id, text_zh, image_url')
    .eq('author_type', 'character');
  if (error) throw error;
  const byCharacterZh = new Map<string, Array<{ id: string; image_url: string | null }>>();
  for (const r of (existing ?? []) as Array<{
    id: string;
    character_id: string | null;
    text_zh: string;
    image_url: string | null;
  }>) {
    const k = `${r.character_id ?? ''}|${r.text_zh}`;
    const arr = byCharacterZh.get(k) ?? [];
    arr.push({ id: r.id, image_url: r.image_url });
    byCharacterZh.set(k, arr);
  }

  const characterSeeds = seed.filter(m => m.authorType === 'character');
  const rowsToInsert: Array<{
    author_type: 'character';
    character_id: string | null;
    text_zh: string;
    text_ja: string;
    text_en: string;
    image_url: string | null;
    base_likes: number;
    created_at: string;
  }> = [];
  const meta: Moment[] = [];
  const imagePatches: Array<{ id: string; image_url: string | null }> = [];

  for (const m of characterSeeds) {
    const k = seedIdentityKey(m);
    if (!k) continue;
    const rows = byCharacterZh.get(k) ?? [];
    const nextImg = m.imageUrl ?? null;
    if (rows.length > 0) {
      for (const row of rows) {
        if ((row.image_url ?? '') !== (nextImg ?? '')) {
          imagePatches.push({ id: row.id, image_url: nextImg });
        }
      }
      continue;
    }
    rowsToInsert.push({
      author_type: 'character',
      character_id: m.characterId ?? null,
      text_zh: m.content.zh,
      text_ja: m.content.ja,
      text_en: m.content.en,
      image_url: nextImg,
      base_likes: Math.max(0, Math.floor(m.likes ?? 0)),
      created_at: m.timestamp.toISOString(),
    });
    meta.push(m);
  }

  for (const p of imagePatches) {
    const { error: uErr } = await supabase.from('moments').update({ image_url: p.image_url }).eq('id', p.id);
    if (uErr) throw uErr;
  }

  if (rowsToInsert.length === 0) return;

  let inserted: Array<{ id: string }> | null = null;
  let insertError: any = null;
  ({ data: inserted, error: insertError } = await supabase.from('moments').insert(rowsToInsert).select('id'));
  if (insertError && String(insertError.message ?? '').includes('base_likes')) {
    // 兼容旧库（尚未执行 base_likes 迁移）
    const fallbackRows = rowsToInsert.map(({ base_likes: _drop, ...rest }) => rest);
    ({ data: inserted, error: insertError } = await supabase.from('moments').insert(fallbackRows).select('id'));
  }
  if (insertError) throw insertError;
  const idList = (inserted ?? []) as Array<{ id: string }>;

  const comments: Array<{
    moment_id: string;
    author_type: 'character';
    character_id: string | null;
    text_zh: string;
    text_ja: string;
    text_en: string;
    created_at: string;
  }> = [];
  const npcLikes: Array<{ moment_id: string; character_id: string }> = [];

  for (let i = 0; i < meta.length; i++) {
    const m = meta[i]!;
    const mid = idList[i]?.id;
    if (!mid || !m.characterId) continue;
    for (const c of m.comments) {
      if (c.authorType !== 'character') continue;
      comments.push({
        moment_id: mid,
        author_type: 'character',
        character_id: c.characterId ?? null,
        text_zh: c.text.zh,
        text_ja: c.text.ja,
        text_en: c.text.en,
        created_at: new Date().toISOString(),
      });
    }
    const candidates = CHARACTERS.map(x => x.id).filter(id => id !== m.characterId);
    const likers = pickLikersFromPool(mid, candidates, Math.min(4, candidates.length));
    for (const lid of likers) npcLikes.push({ moment_id: mid, character_id: lid });
  }

  if (comments.length) {
    const { error: cErr } = await supabase.from('comments').insert(comments);
    if (cErr) throw cErr;
  }
  if (npcLikes.length) await insertCharacterLikesIgnoreDup(npcLikes);
}

export async function fetchMomentsFeed(userId: string) {
  if (!isSupabaseReady()) return { moments: [] as Moment[], likedMomentIds: new Set<string>() };
  let momentsRaw: any[] | null = null;
  let mErr: any = null;
  ({ data: momentsRaw, error: mErr } = await supabase
    .from('moments')
    .select(
      'id, user_id, author_type, character_id, text_zh, text_ja, text_en, image_url, base_likes, created_at'
    )
    .order('created_at', { ascending: false }));
  if (mErr && String(mErr.message ?? '').includes('base_likes')) {
    ({ data: momentsRaw, error: mErr } = await supabase
      .from('moments')
      .select('id, user_id, author_type, character_id, text_zh, text_ja, text_en, image_url, created_at')
      .order('created_at', { ascending: false }));
  }
  if (mErr) throw mErr;
  const allRaw = (momentsRaw ?? []) as MomentRow[];
  const momentRows = dedupeMomentRowsByContent(allRaw);
  const idCanon = buildMomentIdToCanonical(allRaw, momentRows);

  if (momentRows.length > 0) await ensureNpcCrossLikesForFeed(momentRows, allRaw, idCanon);

  const ids = momentRows.map(m => m.id);
  if (ids.length === 0) return { moments: [] as Moment[], likedMomentIds: new Set<string>() };

  const allIds = [...new Set(allRaw.map(m => m.id))];
  const fetchIds = allIds.length > 0 ? allIds : ids;

  const [commentsRes, likesRes, charLikesRes] = await Promise.all([
    supabase
      .from('comments')
      .select('id, moment_id, author_type, user_id, character_id, text_zh, text_ja, text_en, created_at')
      .in('moment_id', fetchIds)
      .order('created_at', { ascending: true }),
    supabase.from('likes').select('moment_id, user_id').in('moment_id', fetchIds),
    supabase.from('character_likes').select('moment_id, character_id').in('moment_id', fetchIds),
  ]);
  const { data: commentsRaw, error: cErr } = commentsRes;
  const { data: likesRaw, error: lErr } = likesRes;
  const { data: charLikesRaw, error: clErr } = charLikesRes;
  if (cErr) throw cErr;
  if (lErr) throw lErr;
  const charLikesSafe = clErr ? [] : dedupCharLikes(remapCharLikes((charLikesRaw ?? []) as CharacterLikeRow[], idCanon));
  if (clErr) {
    // eslint-disable-next-line no-console
    console.warn('[cloudStore] character_likes:', clErr.message);
  }

  const commentsMerged = dedupComments(
    remapCommentMomentIds((commentsRaw ?? []) as CommentRow[], idCanon)
  );
  const likesMerged = dedupUserLikes(remapUserLikes((likesRaw ?? []) as LikeRow[], idCanon));

  const userIds = new Set<string>();
  for (const m of momentRows) if (m.author_type === 'user' && m.user_id) userIds.add(m.user_id);
  for (const c of commentsMerged) if (c.author_type === 'user' && c.user_id) userIds.add(c.user_id);
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

  const moments = momentFromRows(momentRows, commentsMerged, likesMerged, charLikesSafe, usersById);
  const likedMomentIds = new Set(
    likesMerged.filter(it => it.user_id === userId).map(it => it.moment_id)
  );
  return { moments, likedMomentIds };
}

export async function createUserMoment(
  userId: string,
  payload: { content: { zh: string; ja: string; en: string }; imageUrl?: string }
) {
  if (!isSupabaseReady()) return;
  let { error } = await supabase.from('moments').insert({
    user_id: userId,
    author_type: 'user',
    text_zh: payload.content.zh,
    text_ja: payload.content.ja,
    text_en: payload.content.en,
    image_url: payload.imageUrl ?? null,
    base_likes: randomLikeBase(),
  });
  if (error && String(error.message ?? '').includes('base_likes')) {
    ({ error } = await supabase.from('moments').insert({
      user_id: userId,
      author_type: 'user',
      text_zh: payload.content.zh,
      text_ja: payload.content.ja,
      text_en: payload.content.en,
      image_url: payload.imageUrl ?? null,
    }));
  }
  if (error) throw error;
}

export async function createCharacterMoment(
  characterId: string,
  payload: { content: { zh: string; ja: string; en: string }; imageUrl?: string }
) {
  if (!isSupabaseReady()) return;
  // 去重：避免同一角色同文案同图片反复写入导致 Moments 重复。
  // 仅按角色+正文去重：避免同文案换图后插入第二条，feed 去重时丢掉新图。
  const { data: existed } = await supabase
    .from('moments')
    .select('id')
    .eq('author_type', 'character')
    .eq('character_id', characterId)
    .eq('text_zh', payload.content.zh)
    .limit(1);
  if ((existed ?? []).length > 0) return;

  let { error } = await supabase.from('moments').insert({
    author_type: 'character',
    character_id: characterId,
    text_zh: payload.content.zh,
    text_ja: payload.content.ja,
    text_en: payload.content.en,
    image_url: payload.imageUrl ?? null,
    base_likes: randomLikeBase(),
  });
  if (error && String(error.message ?? '').includes('base_likes')) {
    ({ error } = await supabase.from('moments').insert({
      author_type: 'character',
      character_id: characterId,
      text_zh: payload.content.zh,
      text_ja: payload.content.ja,
      text_en: payload.content.en,
      image_url: payload.imageUrl ?? null,
    }));
  }
  if (error) throw error;
}

/** 仅清空当前用户的聊天消息，保留账号信息。 */
export async function clearUserMessages(userId: string) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase.from('messages').delete().eq('user_id', userId);
  if (error) throw error;
}

export interface AlbumImageItem {
  id: string;
  imageUrl: string;
  createdAt: string;
  source: 'user_moment' | 'ai_chat';
}

/** 我的相册聚合：用户动态图片 + AI 聊天配图（倒序）。 */
export async function fetchMyAlbumImages(userId: string): Promise<AlbumImageItem[]> {
  if (!isSupabaseReady()) return [];
  const [momentsRes, chatRes] = await Promise.all([
    supabase
      .from('moments')
      .select('id, image_url, created_at')
      .eq('author_type', 'user')
      .eq('user_id', userId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('id, image_url, created_at')
      .eq('user_id', userId)
      .eq('sender', 'fumo')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false }),
  ]);
  if (momentsRes.error) throw momentsRes.error;
  if (chatRes.error) throw chatRes.error;

  const items: AlbumImageItem[] = [
    ...((momentsRes.data ?? []) as Array<{ id: string; image_url: string | null; created_at: string }>).map(r => ({
      id: `m-${r.id}`,
      imageUrl: r.image_url ?? '',
      createdAt: r.created_at,
      source: 'user_moment' as const,
    })),
    ...((chatRes.data ?? []) as Array<{ id: string; image_url: string | null; created_at: string }>).map(r => ({
      id: `c-${r.id}`,
      imageUrl: r.image_url ?? '',
      createdAt: r.created_at,
      source: 'ai_chat' as const,
    })),
  ]
    .filter(it => Boolean(it.imageUrl))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items;
}

/**
 * 将旧的角色动态配图（如 unsplash 占位图）替换为与文案匹配的 AI 图。
 * - 只处理角色动态
 * - 每次限量处理，避免阻塞页面
 * - 图片写回 Supabase，刷新后持久生效
 */
export async function refreshCharacterMomentImagesByAi(limit = 3) {
  if (!isSupabaseReady()) return 0;
  const { data, error } = await supabase
    .from('moments')
    .select('id, character_id, text_zh, text_ja, text_en, image_url, author_type, created_at')
    .eq('author_type', 'character')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MomentRow[];
  const candidates = rows
    .filter(r => r.character_id)
    .filter(r => {
      const key = `${r.character_id}|${r.text_zh}`;
      if (CHARACTER_SEED_TEXT_ONLY_KEYS.has(key)) return false;
      const u = r.image_url?.trim() ?? '';
      if (!u) return true;
      // 已换成本地种子图或 Storage 的，不要再走 AI 覆盖。
      if (u.startsWith('/moments/') || u.includes('/storage/v1/object')) return false;
      return u.includes('unsplash');
    })
    .slice(0, Math.max(1, limit));

  let changed = 0;
  for (const row of candidates) {
    const text = row.text_zh || row.text_ja || row.text_en;
    if (!text || !row.character_id) continue;
    try {
      const aiUrl = await generateFumoSceneImage(row.character_id, 'zh', text);
      if (!aiUrl) continue;
      const { error: upErr } = await supabase
        .from('moments')
        .update({ image_url: aiUrl })
        .eq('id', row.id);
      if (upErr) continue;
      changed += 1;
    } catch {
      // 单条失败不中断整批
    }
  }
  return changed;
}

/** 仅允许删除当前用户自己发布的动态。 */
export async function deleteUserMoment(userId: string, momentId: string) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', momentId)
    .eq('user_id', userId)
    .eq('author_type', 'user');
  if (error) throw error;
}

export async function createCharacterComment(momentId: string, c: MomentComment) {
  if (!isSupabaseReady() || c.authorType !== 'character') return;
  // 写入前防重：同动态下同角色同文案不重复插入。
  const { data: existed } = await supabase
    .from('comments')
    .select('id')
    .eq('moment_id', momentId)
    .eq('author_type', 'character')
    .eq('character_id', c.characterId ?? null)
    .eq('text_zh', c.text.zh)
    .eq('text_ja', c.text.ja)
    .eq('text_en', c.text.en)
    .limit(1);
  if ((existed ?? []).length > 0) return;

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

/** @returns 新评论在库里的 id，便于前端替换乐观更新的临时 id，删除时才删得掉。 */
export async function createUserComment(
  userId: string,
  momentId: string,
  text: { zh: string; ja: string; en: string }
): Promise<string | null> {
  if (!isSupabaseReady()) return null;
  const { data, error } = await supabase
    .from('comments')
    .insert({
      moment_id: momentId,
      author_type: 'user',
      user_id: userId,
      text_zh: text.zh,
      text_ja: text.ja,
      text_en: text.en,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

/** 仅删除当前用户自己发表的评论。 */
export async function deleteUserComment(userId: string, commentId: string) {
  if (!isSupabaseReady()) return;
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
    .eq('author_type', 'user');
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'character_likes' }, onRefresh)
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

