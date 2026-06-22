import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useC } from '@/components/ui';
import { Backdrop } from '@/components/Backdrop';
import { BrandHeader } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import {
  addComment,
  createPost,
  deletePost,
  listComments,
  listPosts,
  pickCommunityImage,
  react,
  REACTIONS,
  setPinned,
  votePoll,
  type AuthorCard,
  type CommunityComment,
  type CommunityPost,
  type Poll,
} from '@/lib/community';
import type { ImagePickerAsset } from 'expo-image-picker';

const WARN_KEY = 'community_warning_ack_v1';

export default function CommunityScreen() {
  const c = useC();
  const { profile, session } = useAuth();
  const meId = session?.user.id ?? '';
  const isStaff = profile?.accountType === 'staff';

  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [composer, setComposer] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPosts(await listPosts());
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const openComposer = useCallback(async () => {
    const ack = await AsyncStorage.getItem(WARN_KEY).catch(() => null);
    if (ack) { setComposer(true); return; }
    Alert.alert(
      'Community Forum',
      'This is a shared community board — every Xpress Entertainment couple can see what you post here. Only your first name, last initial, photo, and wedding month/year are shown. Please keep it kind and wedding-related!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I understand', onPress: () => { AsyncStorage.setItem(WARN_KEY, '1').catch(() => {}); setComposer(true); } },
      ],
    );
  }, []);

  const onReact = async (p: CommunityPost, emoji: string) => { await react(p.id, emoji, p.myEmoji); load(); };
  const onVote = async (p: CommunityPost, optionId: string) => { await votePoll(p.id, optionId); load(); };
  const onPin = async (p: CommunityPost) => { await setPinned(p.id, !p.pinned); load(); };
  const onDelete = (p: CommunityPost) =>
    Alert.alert('Delete post?', 'This removes it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePost(p.id); load(); } },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <BrandHeader />
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.text }]}>Community</Text>
          <Pressable onPress={openComposer} style={styles.newBtn}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>＋ Post</Text>
          </Pressable>
        </View>

        {!posts ? (
          <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xxl }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: Space.lg, gap: Space.md, paddingBottom: Space.xxl * 3 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.purple} />}
            ListEmptyComponent={
              <Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: Space.xl }}>
                No posts yet — be the first to say hi to the Xpress community! 👋
              </Text>
            }
            renderItem={({ item }) => (
              <PostCard
                post={item}
                c={c}
                canModerate={isStaff}
                isOwner={item.author_id === meId}
                onReact={onReact}
                onVote={onVote}
                onComments={() => setCommentsFor(item.id)}
                onPin={onPin}
                onDelete={onDelete}
              />
            )}
          />
        )}
      </SafeAreaView>

      {composer && <Composer c={c} onClose={() => setComposer(false)} onPosted={() => { setComposer(false); load(); }} />}
      {commentsFor && <CommentsModal postId={commentsFor} c={c} meId={meId} onClose={() => { setCommentsFor(null); load(); }} />}
    </View>
  );
}

function Avatar({ author, size = 42 }: { author: AuthorCard | null; size?: number }) {
  const c = useC();
  const initials = (author?.name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (author?.avatar_url) return <Image source={{ uri: author.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Brand.purple + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Brand.purpleLight, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

function PostCard({
  post, c, canModerate, isOwner, onReact, onVote, onComments, onPin, onDelete,
}: {
  post: CommunityPost;
  c: ReturnType<typeof useC>;
  canModerate: boolean;
  isOwner: boolean;
  onReact: (p: CommunityPost, e: string) => void;
  onVote: (p: CommunityPost, o: string) => void;
  onComments: () => void;
  onPin: (p: CommunityPost) => void;
  onDelete: (p: CommunityPost) => void;
}) {
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: post.pinned ? Brand.purple + '66' : c.border }]}>
      {post.pinned && <Text style={[styles.pinTag, { color: Brand.purpleLight }]}>📌 PINNED</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.sm }}>
        <Avatar author={post.author} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>
            {post.author?.name ?? 'Xpress Couple'}
            {post.author?.is_staff ? <Text style={{ color: Brand.purpleLight }}>  · Xpress Team</Text> : null}
          </Text>
          <Text style={{ color: c.textTertiary, fontSize: 12 }}>
            {post.author?.wedding_label ? `💍 ${post.author.wedding_label}` : ''}
          </Text>
        </View>
        {(canModerate || isOwner) && (
          <View style={{ flexDirection: 'row', gap: Space.md }}>
            {canModerate && <Pressable onPress={() => onPin(post)} hitSlop={8}><Text style={{ fontSize: 16 }}>📌</Text></Pressable>}
            <Pressable onPress={() => onDelete(post)} hitSlop={8}><Text style={{ color: c.textTertiary, fontSize: 16 }}>🗑️</Text></Pressable>
          </View>
        )}
      </View>

      {post.body ? <Text style={{ color: c.text, fontSize: 15, lineHeight: 21, marginTop: Space.sm }}>{post.body}</Text> : null}

      {post.link_url ? (
        <Pressable onPress={() => Linking.openURL(post.link_url!)} style={[styles.link, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
          <Text style={{ color: Brand.purpleLight, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>🔗 {post.link_url}</Text>
        </Pressable>
      ) : null}

      {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.postImg} resizeMode="cover" /> : null}

      {post.poll ? <PollView post={post} c={c} onVote={onVote} /> : null}

      {/* Reactions */}
      <View style={styles.reactRow}>
        {REACTIONS.map((e) => {
          const n = post.reactions[e] ?? 0;
          const on = post.myEmoji === e;
          return (
            <Pressable key={e} onPress={() => onReact(post, e)} style={[styles.reactChip, on ? { backgroundColor: Brand.purple + '22', borderColor: Brand.purple } : { borderColor: c.border }]}>
              <Text style={{ fontSize: 15 }}>{e}</Text>
              {n > 0 && <Text style={{ color: on ? Brand.purpleLight : c.textSecondary, fontSize: 12, fontWeight: '700' }}>{n}</Text>}
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onComments} style={[styles.reactChip, { borderColor: c.border }]}>
          <Text style={{ fontSize: 14 }}>💬</Text>
          <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>{post.commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PollView({ post, c, onVote }: { post: CommunityPost; c: ReturnType<typeof useC>; onVote: (p: CommunityPost, o: string) => void }) {
  const poll = post.poll!;
  const total = Math.max(1, post.pollTotal);
  return (
    <View style={{ marginTop: Space.sm, gap: Space.xs }}>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>{poll.question}</Text>
      {poll.options.map((o) => {
        const n = post.pollCounts[o.id] ?? 0;
        const pct = post.myVote ? Math.round((n / total) * 100) : 0;
        const mine = post.myVote === o.id;
        return (
          <Pressable key={o.id} onPress={() => onVote(post, o.id)} style={[styles.pollOpt, { borderColor: mine ? Brand.purple : c.border, backgroundColor: c.cardAlt }]}>
            {post.myVote ? <View style={[styles.pollFill, { width: `${pct}%`, backgroundColor: Brand.purple + '26' }]} /> : null}
            <Text style={{ color: c.text, fontSize: 14, fontWeight: mine ? '800' : '500', flex: 1 }}>{o.label}</Text>
            {post.myVote ? <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>{pct}%</Text> : null}
          </Pressable>
        );
      })}
      <Text style={{ color: c.textTertiary, fontSize: 11 }}>{post.pollTotal} vote{post.pollTotal === 1 ? '' : 's'}{post.myVote ? '' : ' · tap to vote'}</Text>
    </View>
  );
}

function Composer({ c, onClose, onPosted }: { c: ReturnType<typeof useC>; onClose: () => void; onPosted: () => void }) {
  const [body, setBody] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [busy, setBusy] = useState(false);

  const addPhoto = async () => { try { const a = await pickCommunityImage(); if (a) setPhoto(a); } catch (e) { Alert.alert('Photo', e instanceof Error ? e.message : 'Could not add photo'); } };

  const canPost = body.trim() || photo || link.trim() || (showPoll && question.trim() && options.filter((o) => o.trim()).length >= 2);

  const submit = async () => {
    setBusy(true);
    let poll: Poll | null = null;
    if (showPoll && question.trim()) {
      const opts = options.map((o) => o.trim()).filter(Boolean).map((label, i) => ({ id: String(i + 1), label }));
      if (opts.length >= 2) poll = { question: question.trim(), options: opts };
    }
    try {
      const ok = await createPost({ body, linkUrl: showLink ? link : undefined, photo, poll });
      if (ok) onPosted();
      else { setBusy(false); Alert.alert('Could not post', 'Please try again.'); }
    } catch (e) {
      setBusy(false);
      Alert.alert('Could not post', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '92%' }}>
          <View style={styles.sheetHead}>
            <Pressable onPress={onClose}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></Pressable>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>New post</Text>
            <Pressable onPress={submit} disabled={busy || !canPost}>
              {busy ? <ActivityIndicator color={Brand.purple} /> : <Text style={{ color: canPost ? Brand.purple : c.textTertiary, fontWeight: '800', fontSize: 15 }}>Post</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.md }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <TextInput
              style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border, minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Share something with the community…"
              placeholderTextColor={c.textTertiary}
              value={body}
              onChangeText={setBody}
              multiline
              autoFocus
            />
            {photo ? <Image source={{ uri: photo.uri }} style={styles.postImg} /> : null}
            {showLink ? (
              <TextInput
                style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }]}
                placeholder="https://…"
                placeholderTextColor={c.textTertiary}
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
              />
            ) : null}
            {showPoll ? (
              <View style={{ gap: Space.sm }}>
                <TextInput style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }]} placeholder="Poll question" placeholderTextColor={c.textTertiary} value={question} onChangeText={setQuestion} />
                {options.map((o, i) => (
                  <TextInput key={i} style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }]} placeholder={`Option ${i + 1}`} placeholderTextColor={c.textTertiary} value={o} onChangeText={(t) => setOptions((p) => p.map((x, j) => (j === i ? t : x)))} />
                ))}
                {options.length < 4 && <Pressable onPress={() => setOptions((p) => [...p, ''])}><Text style={{ color: Brand.purpleLight, fontWeight: '700' }}>＋ Add option</Text></Pressable>}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' }}>
              <Tool label="📷 Photo" active={!!photo} onPress={addPhoto} c={c} />
              <Tool label="🔗 Link" active={showLink} onPress={() => setShowLink((v) => !v)} c={c} />
              <Tool label="📊 Poll" active={showPoll} onPress={() => setShowPoll((v) => !v)} c={c} />
            </View>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Tool({ label, active, onPress, c }: { label: string; active: boolean; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable onPress={onPress} style={[styles.tool, active ? { backgroundColor: Brand.purple + '22', borderColor: Brand.purple } : { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Text style={{ color: active ? Brand.purpleLight : c.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function CommentsModal({ postId, c, meId, onClose }: { postId: string; c: ReturnType<typeof useC>; meId: string; onClose: () => void }) {
  const [comments, setComments] = useState<CommunityComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { setComments(await listComments(postId)); }, [postId]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    await addComment(postId, text);
    setText('');
    setBusy(false);
    load();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, height: '75%' }}>
          <View style={styles.sheetHead}>
            <View style={{ width: 50 }} />
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>Comments</Text>
            <Pressable onPress={onClose}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Done</Text></Pressable>
          </View>
          {!comments ? (
            <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(x) => x.id}
              contentContainerStyle={{ padding: Space.lg, gap: Space.md }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              ListEmptyComponent={<Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: Space.lg }}>No comments yet.</Text>}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: Space.sm }}>
                  <Avatar author={item.author} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{item.author?.name ?? 'Xpress Couple'}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 19 }}>{item.body}</Text>
                  </View>
                </View>
              )}
            />
          )}
          <View style={[styles.commentBar, { borderColor: c.border, backgroundColor: c.bg }]}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }]} placeholder="Add a comment…" placeholderTextColor={c.textTertiary} value={text} onChangeText={setText} />
            <Pressable onPress={send} disabled={busy || !text.trim()} style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.5 }]}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.xs },
  title: { fontSize: 30, fontFamily: Fonts.display },
  newBtn: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  pinTag: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  link: { borderWidth: 1, borderRadius: Radius.md, padding: Space.sm, marginTop: Space.sm },
  postImg: { width: '100%', height: 220, borderRadius: Radius.md, marginTop: Space.sm },
  reactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Space.md, flexWrap: 'wrap' },
  reactChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  pollOpt: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden' },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingVertical: Space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.2)' },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 11, fontSize: 15 },
  tool: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 9, paddingHorizontal: 14 },
  commentBar: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.md, borderTopWidth: StyleSheet.hairlineWidth },
  sendBtn: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 11 },
});
