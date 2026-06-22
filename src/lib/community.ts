import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

/* Community board data layer. Posts/reactions/comments/votes read+write directly
   via Supabase (RLS-scoped). Public author cards (first name + last initial,
   avatar = event cover photo, wedding month/year) come from the get_community_authors
   RPC so private client/event data is never exposed. Photos upload through the
   XOS admin route. */

export type AuthorCard = { author_id: string; name: string | null; avatar_url: string | null; wedding_label: string | null; is_staff: boolean };
export type PollOption = { id: string; label: string };
export type Poll = { question: string; options: PollOption[] };

export type CommunityPost = {
  id: string;
  author_id: string;
  body: string | null;
  link_url: string | null;
  image_url: string | null;
  poll: Poll | null;
  pinned: boolean;
  created_at: string;
  author: AuthorCard | null;
  reactionCount: number;
  reactions: Record<string, number>;
  myEmoji: string | null;
  commentCount: number;
  pollCounts: Record<string, number>;
  pollTotal: number;
  myVote: string | null;
};

export type CommunityComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; author: AuthorCard | null };

export const REACTIONS = ['❤️', '🎉', '👏', '🔥', '😍'] as const;

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function authorMap(ids: string[]): Promise<Map<string, AuthorCard>> {
  const map = new Map<string, AuthorCard>();
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return map;
  const { data } = await supabase.rpc('get_community_authors', { p_ids: uniq });
  for (const a of (data ?? []) as AuthorCard[]) map.set(a.author_id, a);
  return map;
}

export async function listPosts(): Promise<CommunityPost[]> {
  const me = await myId();
  const { data: posts } = await supabase
    .from('community_posts')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(120);
  const rows = posts ?? [];
  if (!rows.length) return [];
  const ids = rows.map((p) => p.id);

  const [{ data: reacts }, { data: comments }, { data: votes }, authors] = await Promise.all([
    supabase.from('community_reactions').select('post_id, account_id, emoji').in('post_id', ids),
    supabase.from('community_comments').select('post_id').in('post_id', ids),
    supabase.from('community_poll_votes').select('post_id, account_id, option_id').in('post_id', ids),
    authorMap(rows.map((p) => p.author_id)),
  ]);

  const reactByPost = new Map<string, { counts: Record<string, number>; mine: string | null; total: number }>();
  for (const r of reacts ?? []) {
    const e = reactByPost.get(r.post_id) ?? { counts: {}, mine: null, total: 0 };
    e.counts[r.emoji] = (e.counts[r.emoji] ?? 0) + 1;
    e.total += 1;
    if (r.account_id === me) e.mine = r.emoji;
    reactByPost.set(r.post_id, e);
  }
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  const voteByPost = new Map<string, { counts: Record<string, number>; mine: string | null; total: number }>();
  for (const v of votes ?? []) {
    const e = voteByPost.get(v.post_id) ?? { counts: {}, mine: null, total: 0 };
    e.counts[v.option_id] = (e.counts[v.option_id] ?? 0) + 1;
    e.total += 1;
    if (v.account_id === me) e.mine = v.option_id;
    voteByPost.set(v.post_id, e);
  }

  return rows.map((p) => {
    const re = reactByPost.get(p.id);
    const vo = voteByPost.get(p.id);
    return {
      id: p.id,
      author_id: p.author_id,
      body: p.body ?? null,
      link_url: p.link_url ?? null,
      image_url: p.image_url ?? null,
      poll: (p.poll as Poll) ?? null,
      pinned: !!p.pinned,
      created_at: p.created_at,
      author: authors.get(p.author_id) ?? null,
      reactionCount: re?.total ?? 0,
      reactions: re?.counts ?? {},
      myEmoji: re?.mine ?? null,
      commentCount: commentCount.get(p.id) ?? 0,
      pollCounts: vo?.counts ?? {},
      pollTotal: vo?.total ?? 0,
      myVote: vo?.mine ?? null,
    };
  });
}

export async function pickCommunityImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo access is needed to add a photo.');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0];
}

/* Downscale + recompress before upload. Full-resolution phone photos are several
   MB — too big for the upload endpoint and slow/memory-heavy on device. Cap the
   long edge at 1600px and re-encode as JPEG. Falls back to the original on error. */
async function compressForUpload(asset: ImagePicker.ImagePickerAsset): Promise<{ uri: string; name: string; type: string }> {
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if ((asset.width ?? 0) > 1600) ctx.resize({ width: 1600 });
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' };
  } catch {
    const name = asset.fileName || `photo.${(asset.mimeType ?? 'image/jpeg').split('/')[1] || 'jpg'}`;
    return { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' };
  }
}

async function uploadPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const base = apiBase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!base || !token) throw new Error('Not configured');
  const file = await compressForUpload(asset);
  const form = new FormData();
  form.append('photo', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  // Hard timeout so a cold/slow endpoint can't leave the post spinner stuck forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(`${base}/api/mobile/community-upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: controller.signal });
  } catch {
    throw new Error(controller.signal.aborted ? 'Photo upload timed out — please check your connection and try again.' : 'Photo upload failed — please try again.');
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json.url ?? '';
}

export async function createPost(input: {
  body?: string;
  linkUrl?: string;
  photo?: ImagePicker.ImagePickerAsset | null;
  poll?: Poll | null;
}): Promise<boolean> {
  const me = await myId();
  if (!me) return false;
  let image_url: string | null = null;
  if (input.photo) image_url = await uploadPhoto(input.photo);
  const { error } = await supabase.from('community_posts').insert({
    author_id: me,
    body: input.body?.trim() || null,
    link_url: input.linkUrl?.trim() || null,
    image_url,
    poll: input.poll && input.poll.options.length >= 2 ? input.poll : null,
  });
  return !error;
}

export async function react(postId: string, emoji: string, current: string | null): Promise<void> {
  const me = await myId();
  if (!me) return;
  if (current === emoji) {
    await supabase.from('community_reactions').delete().eq('post_id', postId).eq('account_id', me);
  } else {
    await supabase.from('community_reactions').upsert({ post_id: postId, account_id: me, emoji }, { onConflict: 'post_id,account_id' });
  }
}

export async function votePoll(postId: string, optionId: string): Promise<void> {
  const me = await myId();
  if (!me) return;
  await supabase.from('community_poll_votes').upsert({ post_id: postId, account_id: me, option_id: optionId }, { onConflict: 'post_id,account_id' });
}

export async function listComments(postId: string): Promise<CommunityComment[]> {
  const { data } = await supabase.from('community_comments').select('*').eq('post_id', postId).order('created_at');
  const rows = data ?? [];
  const authors = await authorMap(rows.map((r) => r.author_id));
  return rows.map((r) => ({ ...r, author: authors.get(r.author_id) ?? null }) as CommunityComment);
}

export async function addComment(postId: string, body: string): Promise<boolean> {
  const me = await myId();
  if (!me || !body.trim()) return false;
  const { error } = await supabase.from('community_comments').insert({ post_id: postId, author_id: me, body: body.trim() });
  return !error;
}

export async function setPinned(postId: string, pinned: boolean): Promise<void> {
  await supabase.from('community_posts').update({ pinned, pinned_at: pinned ? new Date().toISOString() : null }).eq('id', postId);
}

export async function deletePost(postId: string): Promise<void> {
  await supabase.from('community_posts').delete().eq('id', postId);
}
