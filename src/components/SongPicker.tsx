import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { addSong, type SongRow } from '@/lib/planning';
import { searchTracks, resolvePreview, type Track } from '@/lib/musicSearch';
import { getRecommendations, type RecommendedSong } from '@/lib/recommendations';
import { importPublicPlaylist, type SpotifyTrack } from '@/lib/spotify';
import { MixtapeLoader } from '@/components/MixtapeLoader';

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
    title: t.title, artist: t.artist, artworkUrl: t.artworkUrl ?? null, previewUrl: t.previewUrl ?? null,
    payload: { title: t.title, artist: t.artist, album: t.album ?? null, artwork_url: t.artworkUrl ?? null, preview_url: t.previewUrl ?? null, external_url: t.externalUrl ?? null, provider: t.provider, provider_id: t.providerId },
  };
}
function fromPlaylistTrack(t: SpotifyTrack): PickItem {
  const provider = t.provider ?? 'spotify';
  return {
    key: `${provider}:${t.providerId}`,
    title: t.title, artist: t.artist, artworkUrl: t.artworkUrl, previewUrl: t.previewUrl,
    payload: { title: t.title, artist: t.artist, album: t.album, artwork_url: t.artworkUrl, preview_url: t.previewUrl, external_url: t.externalUrl, provider, provider_id: t.providerId },
  };
}
function fromRec(s: RecommendedSong): PickItem {
  return {
    key: s.id, title: s.title, artist: s.artist, artworkUrl: s.artwork_url, previewUrl: s.preview_url, reason: s.reason,
    payload: { title: s.title, artist: s.artist, artwork_url: s.artwork_url, preview_url: s.preview_url },
  };
}

export function SongPicker({
  visible, onClose, mode, eventId, eventName, sectionId, sectionTitle, existingTitles, onAdded, onReload,
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
  onReload?: () => void;
}) {
  const c = useC();
  const player = useAudioPlayer(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, 'busy' | 'done'>>({});

  const [fy, setFy] = useState<{ status: 'loading' | 'needs-profile' | 'unconfigured' | 'error' | 'ok'; items: PickItem[]; basis: string[] }>({ status: 'loading', items: [], basis: [] });
  const [fyMore, setFyMore] = useState(false);
  const [tab, setTab] = useState<'search' | 'playlist'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Spotify playlist import — paste a PUBLIC link (no user login / OAuth needed).
  const [plUrl, setPlUrl] = useState('');
  const [plBusy, setPlBusy] = useState(false);
  const [plError, setPlError] = useState<string | null>(null);
  const [plResult, setPlResult] = useState<{ name: string | null; tracks: SpotifyTrack[] } | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);

  // Load For You picks when the sheet opens — excluding songs already on the playlist.
  useEffect(() => {
    if (!(visible && mode === 'foryou')) return;
    let cancelled = false;
    setFy({ status: 'loading', items: [], basis: [] });
    getRecommendations({ eventId, eventName, sectionTitle, exclude: [...existingTitles] }).then((res) => {
      if (cancelled) return;
      if (res.status !== 'ok') { setFy({ status: res.status, items: [], basis: [] }); return; }
      const seen = new Set(existingTitles);
      const items = res.songs.filter((s) => !seen.has(s.title.toLowerCase())).map(fromRec);
      setFy({ status: 'ok', items, basis: res.basis });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, eventId, eventName, sectionTitle]);

  const loadMoreForYou = async () => {
    setFyMore(true);
    const exclude = [...existingTitles, ...fy.items.map((i) => i.title.toLowerCase())];
    const res = await getRecommendations({ eventId, eventName, sectionTitle, exclude });
    if (res.status === 'ok') {
      setFy((prev) => {
        const seen = new Set([...existingTitles, ...prev.items.map((i) => i.title.toLowerCase())]);
        const add = res.songs.filter((s) => !seen.has(s.title.toLowerCase())).map(fromRec);
        return { ...prev, items: [...prev.items, ...add] };
      });
    }
    setFyMore(false);
  };

  useEffect(() => {
    if (!visible) {
      try { player.pause(); } catch {}
      setPlayingKey(null); setAdded({});
      setTab('search'); setQuery(''); setResults([]);
      setPlUrl(''); setPlBusy(false); setPlError(null); setPlResult(null);
      setFy({ status: 'loading', items: [], basis: [] }); setFyMore(false);
    }
  }, [visible, player]);

  // Debounced catalog search
  useEffect(() => {
    if (mode !== 'search' || tab !== 'search') return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const r = await searchTracks(q);
      if (seq === searchSeq.current) { setResults(r); setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, mode, tab]);

  const runImport = useCallback(async () => {
    const url = plUrl.trim();
    if (!url) return;
    setPlBusy(true); setPlError(null); setPlResult(null);
    const res = await importPublicPlaylist(url);
    setPlBusy(false);
    if ('error' in res) {
      setPlError(
        res.error === 'bad_link' ? "That doesn't look like a Spotify or Apple Music playlist link."
          : res.error === 'not_found' ? "Couldn't find that playlist — double-check the link and that it's public."
            : res.error === 'restricted' ? "That playlist is private. Open it in Spotify or Apple Music, make it public/shared, then paste the link again."
              : 'Couldn’t read that playlist. Please try again.',
      );
      return;
    }
    if (res.tracks.length === 0) { setPlError('That playlist has no songs.'); return; }
    setPlResult(res);
  }, [plUrl]);

  const togglePlay = useCallback(async (item: PickItem) => {
    if (playingKey === item.key) { try { player.pause(); } catch {} setPlayingKey(null); return; }
    let url = item.previewUrl;
    if (!url) url = await resolvePreview(item.title, item.artist ?? '');
    if (!url) { setPlayingKey(null); return; }
    try { player.replace({ uri: url }); player.seekTo(0); player.play(); setPlayingKey(item.key); } catch { setPlayingKey(null); }
  }, [playingKey, player]);

  const handleAdd = useCallback(async (item: PickItem) => {
    setAdded((p) => ({ ...p, [item.key]: 'busy' }));
    try {
      const row = await addSong(eventId, sectionId, item.payload);
      if (row) onAdded(row);
      setAdded((p) => ({ ...p, [item.key]: 'done' }));
    } catch { setAdded((p) => { const n = { ...p }; delete n[item.key]; return n; }); }
  }, [eventId, sectionId, onAdded]);

  const importAll = useCallback(async () => {
    if (!plResult) return;
    setImportingAll(true);
    for (const t of plResult.tracks) {
      const item = fromPlaylistTrack(t);
      if (existingTitles.has(item.title.toLowerCase()) || added[item.key] === 'done') continue;
      await handleAdd(item);
    }
    setImportingAll(false);
  }, [plResult, existingTitles, added, handleAdd]);

  const stateFor = (item: PickItem) => added[item.key] ?? (existingTitles.has(item.title.toLowerCase()) ? 'done' : undefined);

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
            <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.md, gap: Space.md }}>
              <View style={[styles.segment, { backgroundColor: c.cardAlt }]}>
                <SegBtn label="Search" active={tab === 'search'} onPress={() => setTab('search')} c={c} />
                <SegBtn label="From a playlist" active={tab === 'playlist'} onPress={() => setTab('playlist')} c={c} />
              </View>
              {tab === 'search' && (
                <View style={[styles.searchBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                  <Text style={{ color: c.textTertiary, fontSize: 16 }}>🔍</Text>
                  <TextInput style={{ flex: 1, color: c.text, fontSize: 16 }} value={query} onChangeText={setQuery} placeholder="Search songs — or paste a YouTube link…" placeholderTextColor={c.textTertiary} autoFocus returnKeyType="search" />
                  {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><Text style={{ color: c.textTertiary }}>✕</Text></Pressable>}
                </View>
              )}
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.sm, paddingBottom: Space.xxl * 2 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
            {mode === 'foryou' ? (
              fy.status === 'loading' ? <MixtapeLoader eventName={eventName} />
              : fy.status === 'needs-profile' ? <Empty text="Head to “Tell us about you” under Let's Get Started and share your story + favorite genres — then we'll fill this with songs picked just for you." />
              : fy.status === 'unconfigured' || fy.status === 'error' ? <Empty text="Song picks aren't available right now. Try the Add music search instead." />
              : fy.items.length === 0 ? (
                <>
                  <Empty text="You've already added the obvious ones! Tap below for fresh ideas." />
                  <LoadMore loading={fyMore} onPress={loadMoreForYou} c={c} />
                </>
              ) : (
                <>
                  {fy.basis.length > 0 && <Text style={{ color: c.textTertiary, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>Based on {fy.basis.join(', ')}</Text>}
                  {fy.items.map((item) => <SongRowView key={item.key} item={item} c={c} playing={playingKey === item.key} state={stateFor(item)} onPlay={() => togglePlay(item)} onAdd={() => handleAdd(item)} />)}
                  <LoadMore loading={fyMore} onPress={loadMoreForYou} c={c} />
                </>
              )
            ) : tab === 'search' ? (
              searching ? <View style={styles.pad}><ActivityIndicator color={Brand.purple} /></View>
              : query.trim().length < 2 ? <Empty text="Search any song or artist to add it to this moment." />
              : results.length === 0 ? <Empty text="No results. Try a different search." />
              : results.map(fromTrack).map((item) => <SongRowView key={item.key} item={item} c={c} playing={playingKey === item.key} state={stateFor(item)} onPlay={() => togglePlay(item)} onAdd={() => handleAdd(item)} />)
            ) : (
              // ── From a playlist: paste a PUBLIC Spotify or Apple Music link (no login needed) ──
              <View style={{ gap: Space.md }}>
                <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
                  Paste a public Spotify or Apple Music playlist link and we&apos;ll pull in the songs. Open the playlist → Share → Copy link (make sure it&apos;s set to Public).
                </Text>
                <View style={[styles.searchBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                  <TextInput
                    style={{ flex: 1, color: c.text, fontSize: 15 }}
                    value={plUrl}
                    onChangeText={setPlUrl}
                    placeholder="Paste a Spotify or Apple Music link…"
                    placeholderTextColor={c.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={runImport}
                  />
                  {plUrl.length > 0 && <Pressable onPress={() => setPlUrl('')} hitSlop={8}><Text style={{ color: c.textTertiary }}>✕</Text></Pressable>}
                </View>
                <Pressable disabled={plBusy || !plUrl.trim()} onPress={runImport} style={[styles.importBtn, (plBusy || !plUrl.trim()) && { opacity: 0.6 }]}>
                  {plBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Import playlist</Text>}
                </Pressable>

                {plError ? <Text style={{ color: '#e0584f', fontSize: 13, lineHeight: 19 }}>{plError}</Text> : null}

                {plResult ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Space.sm }}>
                      <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>{plResult.name ?? 'Playlist'}</Text>
                      <Pressable disabled={importingAll} onPress={importAll} style={[styles.addAll, { backgroundColor: Brand.purple }]}>
                        {importingAll ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add all ({plResult.tracks.length})</Text>}
                      </Pressable>
                    </View>
                    {plResult.tracks.map(fromPlaylistTrack).map((item) => <SongRowView key={item.key} item={item} c={c} playing={playingKey === item.key} state={stateFor(item)} onPlay={() => togglePlay(item)} onAdd={() => handleAdd(item)} />)}
                  </>
                ) : null}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SegBtn({ label, active, onPress, c }: { label: string; active: boolean; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && { backgroundColor: c.card }]}>
      <Text style={{ color: active ? c.text : c.textSecondary, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function SongRowView({ item, c, playing, state, onPlay, onAdd }: { item: PickItem; c: ReturnType<typeof useC>; playing: boolean; state?: 'busy' | 'done'; onPlay: () => void; onAdd: () => void }) {
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={onPlay} style={styles.artWrap}>
        {item.artworkUrl ? <Image source={{ uri: item.artworkUrl }} style={styles.art} /> : <View style={[styles.art, { backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }]}><Text>🎵</Text></View>}
        <View style={styles.playOverlay}><Text style={{ color: '#fff', fontSize: 16 }}>{playing ? '⏸' : '▶'}</Text></View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13 }} numberOfLines={1}>{item.artist}</Text>
        {item.reason ? <Text style={{ color: c.textTertiary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.reason}</Text> : null}
      </View>
      <Pressable disabled={state != null} onPress={onAdd} hitSlop={8}>
        {state === 'done' ? <View style={[styles.addBtn, { backgroundColor: '#16a34a22' }]}><Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 18 }}>✓</Text></View>
          : state === 'busy' ? <View style={[styles.addBtn, { backgroundColor: c.cardAlt }]}><ActivityIndicator size="small" color={Brand.purple} /></View>
          : <View style={[styles.addBtn, { backgroundColor: Brand.purple }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginTop: -2 }}>+</Text></View>}
      </Pressable>
    </View>
  );
}

function LoadMore({ loading, onPress, c }: { loading: boolean; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.loadMore, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      {loading ? <ActivityIndicator size="small" color={Brand.purple} /> : <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 14 }}>Load more songs</Text>}
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  const c = useC();
  return <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.xxl }}>{text}</Text>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, height: 46 },
  pad: { paddingVertical: Space.xxl, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Space.sm },
  artWrap: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  art: { width: 48, height: 48, borderRadius: 8 },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  addAll: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  loadMore: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', marginTop: Space.sm },
  importBtn: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 28, minWidth: 200, alignItems: 'center' },
});
