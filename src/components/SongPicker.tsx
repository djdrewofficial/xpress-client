import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { addSong, type SongRow } from '@/lib/planning';
import { searchTracks, resolvePreview, type Track } from '@/lib/musicSearch';
import { getRecommendations, type RecResult } from '@/lib/recommendations';

type PickItem = {
  key: string;
  title: string;
  artist: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  reason?: string | null;
  payload: Parameters<typeof addSong>[2];
};

function fromTrack(t: Track): PickItem {
  return {
    key: `${t.provider}:${t.providerId}`,
    title: t.title,
    artist: t.artist,
    artworkUrl: t.artworkUrl ?? null,
    previewUrl: t.previewUrl ?? null,
    payload: {
      title: t.title,
      artist: t.artist,
      album: t.album ?? null,
      artwork_url: t.artworkUrl ?? null,
      preview_url: t.previewUrl ?? null,
      external_url: t.externalUrl ?? null,
      provider: t.provider,
      provider_id: t.providerId,
    },
  };
}

export function SongPicker({
  visible,
  onClose,
  mode,
  eventId,
  eventName,
  sectionId,
  sectionTitle,
  existingTitles,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  mode: 'foryou' | 'search';
  eventId: string;
  eventName: string;
  sectionId: string;
  sectionTitle: string;
  existingTitles: Set<string>;
  onAdded: (row: SongRow) => void;
}) {
  const c = useC();
  const player = useAudioPlayer(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, 'busy' | 'done'>>({});

  // For You state
  const [rec, setRec] = useState<RecResult | null>(null);
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);

  // Load recommendations when the For You sheet opens.
  useEffect(() => {
    if (visible && mode === 'foryou') {
      setRec(null);
      getRecommendations({ eventId, eventName, sectionTitle }).then(setRec);
    }
  }, [visible, mode, eventId, eventName, sectionTitle]);

  // Stop audio + reset when the sheet closes.
  useEffect(() => {
    if (!visible) {
      try { player.pause(); } catch {}
      setPlayingKey(null);
      setAdded({});
      if (mode === 'search') { setQuery(''); setResults([]); }
    }
  }, [visible, mode, player]);

  // Debounced search.
  useEffect(() => {
    if (mode !== 'search') return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const r = await searchTracks(q);
      if (seq === searchSeq.current) { setResults(r); setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, mode]);

  const togglePlay = useCallback(async (item: PickItem) => {
    if (playingKey === item.key) { try { player.pause(); } catch {} setPlayingKey(null); return; }
    let url = item.previewUrl;
    if (!url) url = await resolvePreview(item.title, item.artist ?? '');
    if (!url) { setPlayingKey(null); return; }
    try {
      player.replace({ uri: url });
      player.seekTo(0);
      player.play();
      setPlayingKey(item.key);
    } catch { setPlayingKey(null); }
  }, [playingKey, player]);

  const handleAdd = useCallback(async (item: PickItem) => {
    setAdded((p) => ({ ...p, [item.key]: 'busy' }));
    try {
      const row = await addSong(eventId, sectionId, item.payload);
      if (row) onAdded(row);
      setAdded((p) => ({ ...p, [item.key]: 'done' }));
    } catch {
      setAdded((p) => { const n = { ...p }; delete n[item.key]; return n; });
    }
  }, [eventId, sectionId, onAdded]);

  const recItems: PickItem[] = rec?.status === 'ok'
    ? rec.songs.map((s) => ({ key: s.id, title: s.title, artist: s.artist, artworkUrl: s.artwork_url, previewUrl: s.preview_url, reason: s.reason, payload: { title: s.title, artist: s.artist, artwork_url: s.artwork_url, preview_url: s.preview_url } }))
    : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={[styles.header, { borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{mode === 'foryou' ? 'For You' : 'Add music'}</Text>
              <Text style={{ color: c.textTertiary, fontSize: 12 }} numberOfLines={1}>{sectionTitle}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: c.cardAlt }]}>
              <Text style={{ color: c.textSecondary, fontSize: 16, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>

          {mode === 'search' && (
            <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.md }}>
              <View style={[styles.searchBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                <Text style={{ color: c.textTertiary, fontSize: 16 }}>🔍</Text>
                <TextInput
                  style={{ flex: 1, color: c.text, fontSize: 16 }}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search songs or artists…"
                  placeholderTextColor={c.textTertiary}
                  autoFocus
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}><Text style={{ color: c.textTertiary }}>✕</Text></Pressable>
                )}
              </View>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.sm, paddingBottom: Space.xxl * 2 }} keyboardShouldPersistTaps="handled">
            {mode === 'foryou' ? (
              !rec ? (
                <View style={styles.pad}><ActivityIndicator color={Brand.purple} /></View>
              ) : rec.status === 'needs-profile' ? (
                <Empty text="Tell us about yourselves in About Us and your Cultural Influence — then we'll pick songs that fit your story." />
              ) : rec.status === 'unconfigured' || rec.status === 'error' ? (
                <Empty text="Song picks aren't available right now. Try the Add music search instead." />
              ) : recItems.length === 0 ? (
                <Empty text="No picks just yet — check back after you add more about yourselves." />
              ) : (
                <>
                  {rec.basis.length > 0 && <Text style={{ color: c.textTertiary, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>Based on {rec.basis.join(', ')}</Text>}
                  {recItems.map((item) => (
                    <SongRowView key={item.key} item={item} c={c} playing={playingKey === item.key} state={added[item.key] ?? (existingTitles.has(item.title.toLowerCase()) ? 'done' : undefined)} onPlay={() => togglePlay(item)} onAdd={() => handleAdd(item)} />
                  ))}
                </>
              )
            ) : (
              searching ? (
                <View style={styles.pad}><ActivityIndicator color={Brand.purple} /></View>
              ) : query.trim().length < 2 ? (
                <Empty text="Search any song or artist to add it to this moment." />
              ) : results.length === 0 ? (
                <Empty text="No results. Try a different search." />
              ) : (
                results.map(fromTrack).map((item) => (
                  <SongRowView key={item.key} item={item} c={c} playing={playingKey === item.key} state={added[item.key] ?? (existingTitles.has(item.title.toLowerCase()) ? 'done' : undefined)} onPlay={() => togglePlay(item)} onAdd={() => handleAdd(item)} />
                ))
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SongRowView({
  item, c, playing, state, onPlay, onAdd,
}: {
  item: PickItem;
  c: ReturnType<typeof useC>;
  playing: boolean;
  state?: 'busy' | 'done';
  onPlay: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={onPlay} style={styles.artWrap}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.art} />
        ) : (
          <View style={[styles.art, { backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }]}><Text>🎵</Text></View>
        )}
        <View style={styles.playOverlay}>
          <Text style={{ color: '#fff', fontSize: 16 }}>{playing ? '⏸' : '▶'}</Text>
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }} numberOfLines={1}>{item.artist}</Text>
        {item.reason ? <Text style={{ color: c.textTertiary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.reason}</Text> : null}
      </View>
      <Pressable disabled={state != null} onPress={onAdd} hitSlop={8}>
        {state === 'done' ? (
          <View style={[styles.addBtn, { backgroundColor: '#16a34a22' }]}><Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 18 }}>✓</Text></View>
        ) : state === 'busy' ? (
          <View style={[styles.addBtn, { backgroundColor: c.cardAlt }]}><ActivityIndicator size="small" color={Brand.purple} /></View>
        ) : (
          <View style={[styles.addBtn, { backgroundColor: Brand.purple }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginTop: -2 }}>+</Text></View>
        )}
      </Pressable>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const c = useC();
  return <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.xxl }}>{text}</Text>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, height: 46 },
  pad: { paddingVertical: Space.xxl, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Space.sm },
  artWrap: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  art: { width: 48, height: 48, borderRadius: 8 },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
