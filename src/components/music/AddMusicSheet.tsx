import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { Button, Icon, PlayPauseIcon, SegmentedControl, useC } from '@/components/ui';
import { MixtapeLoader } from '@/components/MixtapeLoader';
import { ProviderLogo, type SongProvider } from '@/components/ProviderLogo';
import { RecordVinyl } from '@/components/music/MusicRecord';
import { classifyMusicPaste, isDoNotPlaySectionTitle, playlistProvider } from '@/components/music/model';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';
import { addSong, loadSection, type SongRow } from '@/lib/planning';
import { searchTracks, resolvePreview, type Track } from '@/lib/musicSearch';
import { getRecommendations, type RecommendedSong } from '@/lib/recommendations';
import { importPublicPlaylist, type SpotifyTrack } from '@/lib/spotify';
import { supabase } from '@/lib/supabase';

export type AddMusicSegment = 'search' | 'foryou' | 'import';

export type AddMusicSection = {
  id: string;
  title: string;
  /** Short label after the title, e.g. "B1" or "Moment 04". */
  label?: string;
};

type PickItem = {
  key: string;
  title: string;
  artist: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
  reason?: string | null;
  provider?: SongProvider | null;
  payload: Parameters<typeof addSong>[2];
};

export type AddMusicFixtures = {
  initialQuery?: string;
  initialImportUrl?: string;
  searchResults?: Track[];
  forYou?: RecommendedSong[];
  doNotPlayTitles?: string[];
  playlist?: { name: string | null; url: string; tracks: SpotifyTrack[] };
  /** Result keys that already show as added, with the tray count. Dev previews only. */
  seedAddedKeys?: string[];
  startOnPreview?: boolean;
};

type PreviewList = { name: string | null; url: string; provider: 'apple' | 'spotify'; tracks: SpotifyTrack[] };

function fromTrack(t: Track): PickItem {
  return {
    key: `${t.provider}:${t.providerId}`,
    title: t.title,
    artist: t.artist,
    artworkUrl: t.artworkUrl ?? null,
    previewUrl: t.previewUrl ?? null,
    provider: t.provider,
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

function fromPlaylistTrack(t: SpotifyTrack): PickItem {
  const provider = t.provider ?? 'spotify';
  return {
    key: `${provider}:${t.providerId}`,
    title: t.title,
    artist: t.artist,
    artworkUrl: t.artworkUrl,
    previewUrl: t.previewUrl,
    provider,
    payload: {
      title: t.title,
      artist: t.artist,
      album: t.album,
      artwork_url: t.artworkUrl,
      preview_url: t.previewUrl,
      external_url: t.externalUrl,
      provider,
      provider_id: t.providerId,
    },
  };
}

function fromRec(s: RecommendedSong): PickItem {
  return {
    key: s.id,
    title: s.title,
    artist: s.artist,
    artworkUrl: s.artwork_url,
    previewUrl: s.preview_url,
    reason: s.reason,
    payload: { title: s.title, artist: s.artist, artwork_url: s.artwork_url, preview_url: s.preview_url },
  };
}

function trackKey(t: { provider?: string | null; providerId: string }) {
  return `${t.provider ?? 'spotify'}:${t.providerId}`;
}

function titleKey(title: string) {
  return title.trim().toLowerCase();
}

function initialSelection(tracks: SpotifyTrack[], existing: Set<string>, dnp: Set<string>) {
  const next = new Set<string>();
  for (const track of tracks) {
    const title = titleKey(track.title);
    if (existing.has(title) || dnp.has(title)) continue;
    next.add(trackKey(track));
  }
  return next;
}

function playlistError(code: string, say: (key: TranslationKey) => string): string {
  if (code === 'bad_link') return say('add.badLink');
  if (code === 'not_found') return say('add.notFound');
  if (code === 'restricted') return say('add.restricted');
  return say('add.readFail');
}

async function fetchDoNotPlayTitles(eventId: string): Promise<Set<string>> {
  const [{ data: songs }, { data: sections }] = await Promise.all([
    supabase.from('planning_songs').select('title, do_not_play, section_id').eq('event_id', eventId),
    supabase.from('planning_sections').select('id, title').eq('event_id', eventId),
  ]);
  const dnpSections = new Set((sections ?? []).filter((s) => isDoNotPlaySectionTitle(s.title ?? '')).map((s) => s.id));
  const titles = new Set<string>();
  for (const song of songs ?? []) {
    if (song.do_not_play || dnpSections.has(song.section_id)) titles.add(titleKey(song.title ?? ''));
  }
  return titles;
}

/**
 * One add-music sheet: Search, For you, and Import.
 * Paste an Apple Music, Spotify, or YouTube link in the search field — playlists
 * open the preview step; everything else goes through catalog search.
 * The Moment screen should open this (or `useAddMusic`) instead of a private picker.
 */
export function AddMusicSheet({
  visible,
  onClose,
  initialSegment = 'search',
  eventId,
  eventName,
  sections,
  sectionId,
  onSectionChange,
  existingTitles,
  onAdded,
  onReload,
  fixtures,
}: {
  visible: boolean;
  onClose: () => void;
  initialSegment?: AddMusicSegment;
  eventId: string;
  eventName: string;
  sections: AddMusicSection[];
  sectionId: string;
  onSectionChange?: (sectionId: string) => void;
  existingTitles?: Set<string>;
  onAdded?: (row: SongRow) => void;
  onReload?: () => void;
  /** Offline sample data for the dev preview. Production leaves this unset. */
  fixtures?: AddMusicFixtures;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const inputRef = useRef<TextInput>(null);
  const importRef = useRef<TextInput>(null);
  const searchSeq = useRef(0);
  const fixturesRef = useRef(fixtures);
  fixturesRef.current = fixtures;
  const existingRef = useRef(existingTitles);
  existingRef.current = existingTitles;
  const inflight = useRef(new Set<string>());
  const sectionSeen = useRef(sectionId);
  const wasVisible = useRef(false);

  const [tab, setTab] = useState<AddMusicSegment>(initialSegment);
  const [step, setStep] = useState<'browse' | 'preview'>('browse');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const [fy, setFy] = useState<{ status: 'loading' | 'needs-profile' | 'unconfigured' | 'error' | 'ok'; items: PickItem[]; basis: string[] }>({
    status: 'loading',
    items: [],
    basis: [],
  });
  const [fyMore, setFyMore] = useState(false);
  const [added, setAdded] = useState<Record<string, 'busy' | 'done'>>({});
  const [sessionCount, setSessionCount] = useState(0);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [titles, setTitles] = useState<Set<string>>(new Set());
  const [dnpTitles, setDnpTitles] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const [plUrl, setPlUrl] = useState('');
  const [plBusy, setPlBusy] = useState(false);
  const [plError, setPlError] = useState<string | null>(null);
  const [plResult, setPlResult] = useState<PreviewList | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const titlesRef = useRef(titles);
  titlesRef.current = titles;
  const dnpRef = useRef(dnpTitles);
  dnpRef.current = dnpTitles;

  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const sectionTitle = section?.title ?? 'this moment';
  const sectionLabel = section?.label;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  useEffect(() => {
    if (status.didJustFinish) setPlayingKey(null);
  }, [status.didJustFinish]);

  useEffect(() => {
    if (sectionSeen.current === sectionId) return;
    sectionSeen.current = sectionId;
    setAdded({});
    inflight.current.clear();
  }, [sectionId]);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      return;
    }
    if (!wasVisible.current) return;
    wasVisible.current = false;
    try { player.pause(); } catch { /* already stopped */ }
    setPlayingKey(null);
    setAdded({});
    setSessionCount(0);
    setQuery('');
    setResults([]);
    setLinkNote(null);
    setSearching(false);
    setTab('search');
    setStep('browse');
    setPlUrl('');
    setPlBusy(false);
    setPlError(null);
    setPlResult(null);
    setSelected(new Set());
    setImporting(false);
    setPicking(false);
    setFy({ status: 'loading', items: [], basis: [] });
    setFyMore(false);
    inflight.current.clear();
  }, [visible, player]);

  useEffect(() => {
    if (!visible) return;
    const fx = fixturesRef.current;
    setTab(initialSegment);
    setQuery(fx?.initialQuery ?? '');
    setPlUrl(fx?.initialImportUrl ?? '');
    setPicking(false);
    if (fx?.seedAddedKeys?.length) {
      const seed: Record<string, 'done'> = {};
      for (const key of fx.seedAddedKeys) seed[key] = 'done';
      setAdded(seed);
      setSessionCount(fx.seedAddedKeys.length);
    }
    if (fx?.startOnPreview && fx.playlist) {
      const existing = new Set([...(existingRef.current ?? [])].map((t) => t.trim().toLowerCase()));
      const dnp = new Set((fx.doNotPlayTitles ?? []).map((t) => t.trim().toLowerCase()));
      setPlUrl(fx.playlist.url);
      setPlResult({
        name: fx.playlist.name,
        url: fx.playlist.url,
        provider: playlistProvider(fx.playlist.url, fx.playlist.tracks),
        tracks: fx.playlist.tracks,
      });
      setSelected(initialSelection(fx.playlist.tracks, existing, dnp));
      setStep('preview');
    } else {
      setStep('browse');
    }
  }, [visible, initialSegment]);

  useEffect(() => {
    if (!visible || !eventId || !sectionId) return;
    const fx = fixturesRef.current;
    setTitles(new Set([...(existingRef.current ?? [])].map((t) => t.trim().toLowerCase())));
    if (fx?.doNotPlayTitles) setDnpTitles(new Set(fx.doNotPlayTitles.map((t) => t.trim().toLowerCase())));
    if (fx) return;
    let cancel = false;
    loadSection(eventId, sectionId).then((sec) => {
      if (!cancel) setTitles(new Set(sec.songs.map((s) => titleKey(s.title))));
    });
    fetchDoNotPlayTitles(eventId).then((set) => {
      if (!cancel) setDnpTitles(set);
    });
    return () => {
      cancel = true;
    };
  }, [visible, eventId, sectionId]);

  useEffect(() => {
    if (!visible || step !== 'browse') return;
    const id = setTimeout(() => {
      if (tab === 'search') inputRef.current?.focus();
      if (tab === 'import') importRef.current?.focus();
    }, 280);
    return () => clearTimeout(id);
  }, [visible, tab, step]);

  const showPreview = useCallback((url: string, name: string | null, tracks: SpotifyTrack[]) => {
    setPlUrl(url);
    setPlResult({ name, url, provider: playlistProvider(url, tracks), tracks });
    setSelected(initialSelection(tracks, titlesRef.current, dnpRef.current));
    setPlError(null);
    setStep('preview');
    setTab('import');
    setPicking(false);
  }, []);

  const openPreview = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setPlBusy(true);
    setPlError(null);
    setTab('import');
    const fx = fixturesRef.current;
    if (fx?.playlist) {
      setPlBusy(false);
      showPreview(fx.playlist.url || trimmed, fx.playlist.name, fx.playlist.tracks);
      return;
    }
    const res = await importPublicPlaylist(trimmed);
    setPlBusy(false);
    if ('error' in res) {
      setStep('browse');
      setPlError(playlistError(res.error, t));
      return;
    }
    if (res.tracks.length === 0) {
      setStep('browse');
      setPlError(t('add.emptyList'));
      return;
    }
    showPreview(trimmed, res.name, res.tracks);
  }, [showPreview]);

  const onQuery = (text: string) => {
    setQuery(text);
    setLinkNote(null);
    if (classifyMusicPaste(text) === 'playlist') void openPreview(text);
  };

  useEffect(() => {
    if (!visible || tab !== 'search' || step !== 'browse') return;
    const q = query.trim();
    const kind = classifyMusicPaste(q);
    if (kind === 'playlist' || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const delay = kind === 'search' ? 350 : 0;
    const timer = setTimeout(async () => {
      const fx = fixturesRef.current;
      if (fx?.searchResults) {
        const needle = q.toLowerCase();
        const filtered = fx.searchResults.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(needle));
        if (seq === searchSeq.current) {
          setResults(filtered.length > 0 ? filtered : kind === 'search' ? [] : fx.searchResults);
          setSearching(false);
        }
        return;
      }
      const found = await searchTracks(q);
      if (seq !== searchSeq.current) return;
      if (found.length === 0 && kind === 'link') {
        const imported = await importPublicPlaylist(q);
        if (seq !== searchSeq.current) return;
        if (!('error' in imported) && imported.tracks.length > 0) {
          setSearching(false);
          setResults([]);
          showPreview(q, imported.name, imported.tracks);
          return;
        }
      }
      if (found.length === 0 && (kind === 'link' || kind === 'youtube')) {
        setLinkNote("Couldn't read that link. Check that it's public, or search by song name.");
      }
      setResults(found);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [query, tab, visible, step, showPreview]);

  useEffect(() => {
    if (!(visible && tab === 'foryou' && step === 'browse')) return;
    const fx = fixturesRef.current;
    if (fx) {
      const items = (fx.forYou ?? []).map(fromRec);
      setFy({ status: 'ok', items, basis: items.length ? ['your songs and genres'] : [] });
      return;
    }
    let cancel = false;
    setFy({ status: 'loading', items: [], basis: [] });
    getRecommendations({ eventId, eventName, sectionTitle, exclude: [...titlesRef.current] }).then((res) => {
      if (cancel) return;
      if (res.status !== 'ok') {
        setFy({ status: res.status, items: [], basis: [] });
        return;
      }
      const seen = new Set(titlesRef.current);
      setFy({ status: 'ok', items: res.songs.filter((s) => !seen.has(titleKey(s.title))).map(fromRec), basis: res.basis });
    });
    return () => {
      cancel = true;
    };
  }, [visible, tab, step, eventId, eventName, sectionTitle]);

  const loadMoreForYou = async () => {
    if (fixturesRef.current) return;
    setFyMore(true);
    const exclude = [...titlesRef.current, ...fy.items.map((i) => titleKey(i.title))];
    const res = await getRecommendations({ eventId, eventName, sectionTitle, exclude });
    if (res.status === 'ok') {
      setFy((prev) => {
        const seen = new Set([...titlesRef.current, ...prev.items.map((i) => titleKey(i.title))]);
        const add = res.songs.filter((s) => !seen.has(titleKey(s.title))).map(fromRec);
        return { ...prev, items: [...prev.items, ...add] };
      });
    }
    setFyMore(false);
  };

  const togglePlay = useCallback(async (item: PickItem) => {
    if (playingKey === item.key) {
      try { player.pause(); } catch { /* already stopped */ }
      setPlayingKey(null);
      return;
    }
    let url = item.previewUrl;
    if (!url && !fixturesRef.current) url = await resolvePreview(item.title, item.artist ?? '');
    if (!url) {
      setPlayingKey(null);
      return;
    }
    try {
      player.replace({ uri: url });
      player.seekTo(0);
      player.play();
      setPlayingKey(item.key);
    } catch {
      setPlayingKey(null);
    }
  }, [playingKey, player]);

  const handleAdd = useCallback(async (item: PickItem) => {
    const title = titleKey(item.title);
    if (titlesRef.current.has(title) || inflight.current.has(item.key)) return false;
    inflight.current.add(item.key);
    setAdded((p) => ({ ...p, [item.key]: 'busy' }));
    try {
      if (!fixturesRef.current) {
        const row = await addSong(eventId, sectionId, item.payload);
        if (row) onAdded?.(row);
      }
      titlesRef.current = new Set(titlesRef.current).add(title);
      setTitles(new Set(titlesRef.current));
      setAdded((p) => ({ ...p, [item.key]: 'done' }));
      setSessionCount((n) => n + 1);
      return true;
    } catch {
      setAdded((p) => {
        const next = { ...p };
        delete next[item.key];
        return next;
      });
      return false;
    } finally {
      inflight.current.delete(item.key);
    }
  }, [eventId, sectionId, onAdded]);

  const stateFor = (item: PickItem) => added[item.key] ?? (titles.has(titleKey(item.title)) ? 'done' : undefined);

  const commitImport = async () => {
    if (!plResult || importing) return;
    setImporting(true);
    const seen = new Set(titlesRef.current);
    for (const track of plResult.tracks) {
      const title = titleKey(track.title);
      if (!selected.has(trackKey(track)) || seen.has(title)) continue;
      const ok = await handleAdd(fromPlaylistTrack(track));
      if (ok) seen.add(title);
    }
    setImporting(false);
    onReload?.();
    setStep('browse');
    setTab('search');
  };

  const toggleSelected = (track: SpotifyTrack) => {
    if (titles.has(titleKey(track.title))) return;
    const key = trackKey(track);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (!plResult) return;
    const selectable = plResult.tracks.filter((t) => !titles.has(titleKey(t.title)) && !dnpTitles.has(titleKey(t.title)));
    const allOn = selectable.length > 0 && selectable.every((t) => selected.has(trackKey(t)));
    setSelected(allOn ? new Set() : new Set(selectable.map(trackKey)));
  };

  const importCount = (plResult?.tracks ?? []).filter((t) => selected.has(trackKey(t)) && !titles.has(titleKey(t.title))).length;
  const canPick = sections.length > 1 && !!onSectionChange;

  const chooseSection = (id: string) => {
    onSectionChange?.(id);
    setPicking(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          {step === 'preview' && plResult ? (
            <PreviewStep
              list={plResult}
              titles={titles}
              dnpTitles={dnpTitles}
              selected={selected}
              importCount={importCount}
              importing={importing}
              sectionTitle={sectionTitle}
              canPick={canPick}
              picking={picking}
              sections={sections}
              sectionId={section?.id ?? sectionId}
              onBack={() => { setStep('browse'); setPicking(false); }}
              onClose={onClose}
              onToggle={toggleSelected}
              onSelectAll={selectAll}
              onPick={() => setPicking(true)}
              onChoose={chooseSection}
              onImport={commitImport}
            />
          ) : (
            <>
              <View style={styles.top}>
                <View style={[styles.handle, { backgroundColor: c.ink3 }]} />
                <View style={styles.titleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.title, { color: c.ink }]}>{t('add.title')}</Text>
                    <Pressable onPress={canPick ? () => setPicking((p) => !p) : undefined} disabled={!canPick} style={styles.noOutline}>
                      <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
                        {t('add.to', { title: sectionTitle })}
                        {sectionLabel ? ` · ${sectionLabel}` : ''}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')} style={[styles.close, { backgroundColor: c.surface2 }]}>
                    <Icon name="close" size={16} color={c.ink2} />
                  </Pressable>
                </View>
              </View>

              {picking ? (
                <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 40 }}>
                  <Text style={[Type.label, { color: c.accent, marginBottom: 4 }]}>{t('add.addTo')}</Text>
                  {sections.map((s) => {
                    const on = s.id === (section?.id ?? sectionId);
                    return (
                      <Pressable key={s.id} onPress={() => chooseSection(s.id)} style={[styles.pickRow, { backgroundColor: c.surface, borderColor: on ? c.accent : c.line }]}>
                        <Text style={[styles.pickLabel, { color: c.red }]}>{s.label ?? ''}</Text>
                        <Text style={{ flex: 1, color: c.ink, fontFamily: Fonts.semibold, fontSize: 15 }} numberOfLines={1}>{s.title}</Text>
                        {on ? <Icon name="check" size={18} color={c.accent} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <>
                  {tab === 'search' ? (
                    <View style={{ paddingHorizontal: 20, gap: 8 }}>
                      <Text style={[Type.label, { color: c.accent }]}>{t('add.search')}</Text>
                      <View style={[styles.field, { backgroundColor: c.surface, borderColor: focused ? c.red : c.line }]}>
                        <Icon name="search" size={18} color={c.ink3} />
                        <TextInput
                          ref={inputRef}
                          style={[styles.input, { color: c.ink }]}
                          value={query}
                          onChangeText={onQuery}
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          placeholder={t('add.searchPh')}
                          placeholderTextColor={c.ink3}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="search"
                        />
                        {query.length > 0 ? (
                          <Pressable onPress={() => { setQuery(''); setLinkNote(null); }} hitSlop={8} accessibilityLabel={t('add.clear')}>
                            <Icon name="close" size={16} color={c.ink3} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                    <SegmentedControl
                      options={[
                        { value: 'search', label: t('add.search') },
                        { value: 'foryou', label: t('add.forYou') },
                        { value: 'import', label: t('add.import') },
                      ]}
                      value={tab}
                      onChange={setTab}
                    />
                  </View>

                  <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: sessionCount > 0 ? 120 : 32, gap: 8 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    automaticallyAdjustKeyboardInsets>
                    {tab === 'search' ? (
                      <SearchResults
                        query={query}
                        searching={searching}
                        results={results}
                        linkNote={linkNote}
                        stateFor={stateFor}
                        playingKey={playingKey}
                        onPlay={togglePlay}
                        onAdd={handleAdd}
                      />
                    ) : tab === 'foryou' ? (
                      <ForYou
                        fy={fy}
                        fyMore={fyMore}
                        eventName={eventName}
                        stateFor={stateFor}
                        playingKey={playingKey}
                        onPlay={togglePlay}
                        onAdd={handleAdd}
                        onMore={loadMoreForYou}
                      />
                    ) : (
                      <ImportStart
                        url={plUrl}
                        busy={plBusy}
                        error={plError}
                        onChange={setPlUrl}
                        onSubmit={() => openPreview(plUrl)}
                        inputRef={importRef}
                      />
                    )}
                  </ScrollView>

                  {sessionCount > 0 ? (
                    <View style={[styles.trayWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                      <View style={[styles.tray, { backgroundColor: c.night }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trayCount}>
                            {t(sessionCount === 1 ? 'add.addedOne' : 'add.addedMany', { count: sessionCount })}
                          </Text>
                          <Text style={styles.trayTo} numberOfLines={1}>{t('add.to', { title: sectionTitle })}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.done} accessibilityRole="button">
                          <Text style={styles.doneLabel}>{t('common.done')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SearchResults({
  query,
  searching,
  results,
  linkNote,
  stateFor,
  playingKey,
  onPlay,
  onAdd,
}: {
  query: string;
  searching: boolean;
  results: Track[];
  linkNote: string | null;
  stateFor: (item: PickItem) => 'busy' | 'done' | undefined;
  playingKey: string | null;
  onPlay: (item: PickItem) => void;
  onAdd: (item: PickItem) => void;
}) {
  const c = useC();
  const { t } = useT();
  if (searching) return <View style={styles.pad}><ActivityIndicator color={c.accent} /></View>;
  if (query.trim().length < 2) {
    return <Empty text={t('add.searchEmpty')} />;
  }
  if (results.length === 0) return <Empty text={linkNote ?? t('add.noResults')} />;
  return (
    <View style={{ gap: 0 }}>
      <Text style={[Type.label, { color: c.ink3, marginBottom: 4 }]}>{t('add.songs')}</Text>
      {results.map(fromTrack).map((item) => (
        <ResultRow key={item.key} item={item} playing={playingKey === item.key} state={stateFor(item)} onPlay={() => onPlay(item)} onAdd={() => onAdd(item)} />
      ))}
    </View>
  );
}

function ForYou({
  fy,
  fyMore,
  eventName,
  stateFor,
  playingKey,
  onPlay,
  onAdd,
  onMore,
}: {
  fy: { status: 'loading' | 'needs-profile' | 'unconfigured' | 'error' | 'ok'; items: PickItem[]; basis: string[] };
  fyMore: boolean;
  eventName: string;
  stateFor: (item: PickItem) => 'busy' | 'done' | undefined;
  playingKey: string | null;
  onPlay: (item: PickItem) => void;
  onAdd: (item: PickItem) => void;
  onMore: () => void;
}) {
  const c = useC();
  const { t } = useT();
  if (fy.status === 'loading') return <MixtapeLoader eventName={eventName} />;
  if (fy.status === 'needs-profile') {
    return <Empty text={t('add.needsProfile')} />;
  }
  if (fy.status === 'unconfigured' || fy.status === 'error') {
    return <Empty text={t('add.unconfigured')} />;
  }
  if (fy.items.length === 0) {
    return (
      <View style={{ gap: 12 }}>
        <Empty text={t('add.fresh')} />
        <LoadMore loading={fyMore} onPress={onMore} />
      </View>
    );
  }
  return (
    <View style={{ gap: 0 }}>
      {fy.basis.length > 0 ? <Text style={[Type.footnote, { color: c.ink3, fontStyle: 'italic', marginBottom: 8 }]}>{t('add.basedOn', { basis: fy.basis.join(', ') })}</Text> : null}
      {fy.items.map((item) => (
        <ResultRow key={item.key} item={item} playing={playingKey === item.key} state={stateFor(item)} onPlay={() => onPlay(item)} onAdd={() => onAdd(item)} />
      ))}
      <LoadMore loading={fyMore} onPress={onMore} />
    </View>
  );
}

function ImportStart({
  url,
  busy,
  error,
  onChange,
  onSubmit,
  inputRef,
}: {
  url: string;
  busy: boolean;
  error: string | null;
  onChange: (url: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<TextInput | null>;
}) {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ gap: 14 }}>
      <Text style={[Type.footnote, { color: c.ink2 }]}>
        {t('add.importHelp')}
      </Text>
      <ProviderLine provider="apple" title={t('add.apple')} detail={t('add.appleDetail')} />
      <ProviderLine provider="spotify" title={t('add.spotify')} detail={t('add.spotifyDetail')} />
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="link" size={18} color={c.ink3} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: c.ink }]}
          value={url}
          onChangeText={onChange}
          placeholder={t('add.pastePh')}
          placeholderTextColor={c.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <Button label={busy ? t('add.reading') : t('add.preview')} onPress={onSubmit} disabled={busy || !url.trim()} />
      {error ? <Text style={{ color: c.danger, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
    </View>
  );
}

function ProviderLine({ provider, title, detail }: { provider: SongProvider; title: string; detail: string }) {
  const c = useC();
  return (
    <View style={[styles.provider, { backgroundColor: c.surface, borderColor: c.line }]}>
      <ProviderLogo provider={provider} size={28} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontFamily: Fonts.semibold, fontSize: 15 }}>{title}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{detail}</Text>
      </View>
    </View>
  );
}

function ResultRow({
  item,
  playing,
  state,
  onPlay,
  onAdd,
}: {
  item: PickItem;
  playing: boolean;
  state?: 'busy' | 'done';
  onPlay: () => void;
  onAdd: () => void;
}) {
  const c = useC();
  const { t } = useT();
  return (
    <View style={[styles.result, { borderColor: c.line }]}>
      <Pressable onPress={onPlay} style={styles.artWrap} accessibilityLabel={t('add.previewA11y', { title: item.title })}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.art} />
        ) : (
          <LinearGradient colors={[c.accent, '#2a1a52']} style={styles.art}>
            <Icon name="waveform" size={18} color="#fff" />
          </LinearGradient>
        )}
        <View style={styles.playOverlay}><PlayPauseIcon playing={playing} size={14} color="#fff" /></View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontFamily: Fonts.semibold, fontSize: 15 }} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {item.provider && item.provider !== 'manual' ? <ProviderLogo provider={item.provider} size={13} /> : null}
          <Text style={[Type.footnote, { color: c.ink2, flexShrink: 1 }]} numberOfLines={1}>{item.artist}</Text>
        </View>
        {item.reason ? <Text style={[Type.footnote, { color: c.ink3, marginTop: 2 }]} numberOfLines={1}>{item.reason}</Text> : null}
      </View>
      <Pressable
        disabled={state != null}
        onPress={onAdd}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={state === 'done' ? `${item.title} added` : `Add ${item.title}`}>
        {state === 'busy' ? (
          <View style={[styles.plus, { borderColor: c.line }]}><ActivityIndicator size="small" color={c.accent} /></View>
        ) : state === 'done' ? (
          <View style={[styles.plus, { backgroundColor: c.accent, borderColor: c.accent }]}><Icon name="check" size={16} color={c.onAccent} /></View>
        ) : (
          <View style={[styles.plus, { borderColor: c.line }]}><Icon name="plus" size={16} color={c.ink2} /></View>
        )}
      </Pressable>
    </View>
  );
}

function PreviewStep({
  list,
  titles,
  dnpTitles,
  selected,
  importCount,
  importing,
  sectionTitle,
  canPick,
  picking,
  sections,
  sectionId,
  onBack,
  onClose,
  onToggle,
  onSelectAll,
  onPick,
  onChoose,
  onImport,
}: {
  list: PreviewList;
  titles: Set<string>;
  dnpTitles: Set<string>;
  selected: Set<string>;
  importCount: number;
  importing: boolean;
  sectionTitle: string;
  canPick: boolean;
  picking: boolean;
  sections: AddMusicSection[];
  sectionId: string;
  onBack: () => void;
  onClose: () => void;
  onToggle: (track: SpotifyTrack) => void;
  onSelectAll: () => void;
  onPick: () => void;
  onChoose: (id: string) => void;
  onImport: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const addedCount = list.tracks.filter((track) => titles.has(titleKey(track.title))).length;
  const dnpCount = list.tracks.filter((t) => dnpTitles.has(titleKey(t.title))).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <View style={[styles.handle, { backgroundColor: c.ink3 }]} />
        <View style={styles.titleRow}>
          <Pressable onPress={onBack} hitSlop={12} accessibilityLabel={t('common.back')} style={styles.back}>
            <Icon name="chev-l" size={22} color={c.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[Type.label, { color: c.red }]}>{t('add.step')}</Text>
            <Text style={[Type.title, { color: c.ink }]} numberOfLines={1}>{t('add.check')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')} style={[styles.close, { backgroundColor: c.surface2 }]}>
            <Icon name="close" size={16} color={c.ink2} />
          </Pressable>
        </View>
      </View>

      {picking ? (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
          <Text style={[Type.label, { color: c.accent, marginBottom: 4 }]}>{t('add.addTo')}</Text>
          {sections.map((s) => {
            const on = s.id === sectionId;
            return (
              <Pressable key={s.id} onPress={() => onChoose(s.id)} style={[styles.pickRow, { backgroundColor: c.surface, borderColor: on ? c.accent : c.line }]}>
                <Text style={[styles.pickLabel, { color: c.red }]}>{s.label ?? ''}</Text>
                <Text style={{ flex: 1, color: c.ink, fontFamily: Fonts.semibold, fontSize: 15 }} numberOfLines={1}>{s.title}</Text>
                {on ? <Icon name="check" size={18} color={c.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
            <LinearGradient colors={['#241447', '#3d2278', '#4b328e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plCard}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <RecordVinyl size={74} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ProviderLogo provider={list.provider} size={16} />
                    <Text style={styles.plEyebrow}>{list.provider === 'apple' ? t('add.appleList') : t('add.spotifyList')}</Text>
                  </View>
                  <Text style={styles.plName} numberOfLines={2}>{list.name ?? t('add.playlist')}</Text>
                  <Text style={styles.plUrl} numberOfLines={1}>{list.url.replace(/^https?:\/\//, '')}</Text>
                </View>
              </View>
              <View style={styles.plStats}>
                <Mini value={list.tracks.length} label={t('add.songs')} />
                <Mini value={addedCount} label={t('add.added')} />
                <Mini value={dnpCount} label={t('record.doNotPlay')} tone="red" />
              </View>
            </LinearGradient>

            <View style={styles.selectRow}>
              <Text style={[Type.label, { color: c.ink3 }]}>
                {t('add.selected', { count: importCount, total: list.tracks.length })}
              </Text>
              <Pressable onPress={onSelectAll} hitSlop={8}>
                <Text style={[Type.label, { color: c.accent }]}>{t('add.selectAll')}</Text>
              </Pressable>
            </View>

            {list.tracks.map((track, index) => {
              const title = titleKey(track.title);
              const existing = titles.has(title);
              const dnp = dnpTitles.has(title);
              const checked = !existing && selected.has(trackKey(track));
              return (
                <Pressable key={`${trackKey(track)}:${index}`} onPress={() => onToggle(track)} disabled={existing} style={styles.checkRow}>
                  <View style={[styles.box, { backgroundColor: checked ? c.accent : 'transparent', borderColor: checked ? c.accent : c.line, opacity: existing ? 0.45 : 1 }]}>
                    {checked ? <Icon name="check" size={14} color={c.onAccent} /> : null}
                  </View>
                  <Text style={[styles.num, { color: dnp ? c.ink3 : c.red }]}>{String(index + 1).padStart(2, '0')}</Text>
                  {dnp ? (
                    <View style={[styles.artSm, { backgroundColor: c.surface2 }]}><Icon name="ban" size={16} color={c.danger} /></View>
                  ) : track.artworkUrl ? (
                    <Image source={{ uri: track.artworkUrl }} style={styles.artSm} />
                  ) : (
                    <LinearGradient colors={[c.accent, '#2a1a52']} style={[styles.artSm, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Icon name="waveform" size={14} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: dnp ? c.ink3 : c.ink, fontFamily: Fonts.semibold, fontSize: 15, textDecorationLine: dnp ? 'line-through' : 'none' }}
                      numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>{track.artist}</Text>
                    {dnp ? (
                      <Text style={[Type.footnote, { color: c.danger, marginTop: 2 }]}>{t('add.onDnp')}</Text>
                    ) : existing ? (
                      <Text style={[Type.footnote, { color: c.ink3, marginTop: 2 }]}>{t('add.already')}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            <Pressable onPress={canPick ? onPick : undefined} style={[styles.addTo, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.bubble, { backgroundColor: c.accentTint }]}><Icon name="mic" size={18} color={c.accent} /></View>
              <Text style={{ flex: 1, color: c.ink, fontFamily: Fonts.semibold, fontSize: 15 }}>{t('add.addTo')}</Text>
              <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>{sectionTitle}</Text>
              {canPick ? <Icon name="chev-r" size={18} color={c.ink3} /> : null}
            </Pressable>
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
            <Button
              label={importing ? t('add.importing') : t(importCount === 1 ? 'add.importOne' : 'add.importMany', { count: importCount })}
              onPress={onImport}
              disabled={importing || importCount === 0}
            />
          </View>
        </>
      )}
    </View>
  );
}

function Mini({ value, label, tone }: { value: number; label: string; tone?: 'red' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: tone === 'red' ? '#fe3a3b' : '#fff', fontFamily: Fonts.bold, fontSize: 20 }}>{value}</Text>
      <Text style={styles.plStat}>{label}</Text>
    </View>
  );
}

function LoadMore({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const c = useC();
  const { t } = useT();
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.loadMore, { backgroundColor: c.surface2, borderColor: c.line }]}>
      {loading ? <ActivityIndicator size="small" color={c.accent} /> : <Text style={{ color: c.accent, fontFamily: Fonts.bold, fontSize: 14 }}>{t('add.loadMore')}</Text>}
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  const c = useC();
  return <Text style={[Type.footnote, { color: c.ink2, textAlign: 'center', paddingVertical: 28 }]}>{text}</Text>;
}

/**
 * Opens the shared add-music sheet. The Moment screen can call `open` when
 * its Add music button is pressed; the sheet element belongs next to the screen.
 */
export function useAddMusic({
  eventId,
  eventName,
  sections,
  onAdded,
  onReload,
}: {
  eventId: string;
  eventName: string;
  sections: AddMusicSection[];
  onAdded?: (row: SongRow) => void;
  onReload?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [segment, setSegment] = useState<AddMusicSegment>('search');

  const open = useCallback((opts?: { sectionId?: string; segment?: AddMusicSegment }) => {
    const next = opts?.sectionId ?? sections[0]?.id ?? '';
    if (!next) return;
    setSectionId(next);
    setSegment(opts?.segment ?? 'search');
    setVisible(true);
  }, [sections]);

  const close = useCallback(() => setVisible(false), []);

  const sheet = (
    <AddMusicSheet
      visible={visible}
      onClose={close}
      initialSegment={segment}
      eventId={eventId}
      eventName={eventName}
      sections={sections}
      sectionId={sectionId}
      onSectionChange={setSectionId}
      onAdded={onAdded}
      onReload={onReload}
    />
  );

  return { open, close, sheet, visible };
}

/** Same sheet the section screen and onboarding already open. */
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
  onReload,
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
  return (
    <AddMusicSheet
      visible={visible}
      onClose={onClose}
      initialSegment={mode === 'foryou' ? 'foryou' : 'search'}
      eventId={eventId}
      eventName={eventName}
      sections={[{ id: sectionId, title: sectionTitle }]}
      sectionId={sectionId}
      existingTitles={existingTitles}
      onAdded={onAdded}
      onReload={onReload}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { flex: 1, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, overflow: 'hidden' },
  top: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: Radius.pill, marginBottom: 12, opacity: 0.45 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  noOutline: { outlineStyle: 'none' } as object,
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 16, paddingVertical: 0, outlineStyle: 'none' } as object,
  pad: { paddingVertical: 36, alignItems: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  artWrap: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden' },
  art: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  plus: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: 12 },
  loadMore: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  trayWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  tray: { borderRadius: 28, paddingLeft: 18, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trayCount: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
  trayTo: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.body, fontSize: 13 },
  done: { backgroundColor: '#fe3a3b', borderRadius: Radius.pill, paddingHorizontal: 18, height: 40, alignItems: 'center', justifyContent: 'center' },
  doneLabel: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  pickLabel: { width: 32, fontFamily: Fonts.bold, fontSize: 14 },
  plCard: { borderRadius: Radius.lg, padding: 16, gap: 16 },
  plEyebrow: { color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  plName: { color: '#fff', fontFamily: Fonts.display, fontSize: 22, lineHeight: 26 },
  plUrl: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.body, fontSize: 12 },
  plStats: { flexDirection: 'row' },
  plStat: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  num: { width: 24, fontFamily: Fonts.bold, fontSize: 13 },
  artSm: { width: 36, height: 36, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  addTo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: 12, marginTop: 4 },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
