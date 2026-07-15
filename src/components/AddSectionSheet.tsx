import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton, useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import {
  getAddableSections,
  addSectionFromTemplate,
  addCustomSection,
  type AddableSection,
  type NewSong,
} from '@/lib/planning';
import { searchTracks, type Track } from '@/lib/musicSearch';

/* Couple adds a section to a group — either a common one staff flagged (Bouquet
   Toss, Chair Game…) or a fully custom one (name + notes + up to 3 songs). */

type Mode = 'menu' | 'custom';

export function AddSectionSheet({
  visible,
  eventId,
  groupId,
  groupTitle,
  onClose,
  onAdded,
}: {
  visible: boolean;
  eventId: string;
  groupId: string;
  groupTitle?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const c = useC();
  const [mode, setMode] = useState<Mode>('menu');
  const [addable, setAddable] = useState<AddableSection[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // custom builder
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [songs, setSongs] = useState<NewSong[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode('menu');
    setError(null);
    setName('');
    setNotes('');
    setSongs([]);
    setQuery('');
    setResults([]);
    setAddable(null);
    getAddableSections(eventId).then(setAddable).catch(() => setAddable([]));
  }, [visible, eventId]);

  useEffect(() => {
    if (mode !== 'custom') return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchTracks(q);
      if (!cancelled) { setResults(r); setSearching(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, mode]);

  const pickTemplate = async (t: AddableSection) => {
    setBusy(true);
    setError(null);
    const ok = await addSectionFromTemplate(eventId, groupId, t.templateSectionId);
    setBusy(false);
    if (ok) { onAdded(); onClose(); } else setError('Could not add that section. Please try again.');
  };

  const addSongToDraft = (t: Track) => {
    if (songs.length >= 3) return;
    if (songs.some((s) => s.provider_id === t.providerId)) return;
    setSongs((prev) => [
      ...prev,
      {
        title: t.title,
        artist: t.artist,
        album: t.album ?? null,
        artwork_url: t.artworkUrl ?? null,
        preview_url: t.previewUrl ?? null,
        external_url: t.externalUrl ?? null,
        provider: t.provider,
        provider_id: t.providerId,
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const saveCustom = async () => {
    const title = name.trim();
    if (!title) { setError('Give your section a name.'); return; }
    setBusy(true);
    setError(null);
    const ok = await addCustomSection(eventId, groupId, { title, notes: notes.trim() || undefined, songs });
    setBusy(false);
    if (ok) { onAdded(); onClose(); } else setError('Could not add the section. Please try again.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={[styles.hdr, { borderColor: c.border }]}>
            <Pressable onPress={mode === 'custom' ? () => setMode('menu') : onClose} hitSlop={10}>
              <Text style={{ color: Brand.purpleLight, fontSize: 16, fontWeight: '600' }}>{mode === 'custom' ? '‹ Back' : 'Cancel'}</Text>
            </Pressable>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{mode === 'custom' ? 'Custom section' : 'Add a section'}</Text>
            <View style={{ width: 54 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.md, paddingBottom: Space.xxl * 2 }} keyboardShouldPersistTaps="handled">
            {groupTitle ? <Text style={{ color: c.textTertiary, fontSize: 13 }}>Adding to {groupTitle}</Text> : null}

            {mode === 'menu' ? (
              <>
                {addable === null ? (
                  <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
                ) : addable.length === 0 ? (
                  <Text style={{ color: c.textTertiary, fontSize: 14 }}>No suggested sections right now — you can still create a custom one below.</Text>
                ) : (
                  <>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>SUGGESTED</Text>
                    {addable.map((t) => (
                      <Pressable key={t.templateSectionId} disabled={busy} onPress={() => pickTemplate(t)} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
                        <Text style={{ fontSize: 22 }}>{t.icon ?? '✨'}</Text>
                        <Text style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: '600' }}>{t.title}</Text>
                        <Text style={{ color: Brand.purpleLight, fontSize: 22 }}>＋</Text>
                      </Pressable>
                    ))}
                  </>
                )}
                <Pressable disabled={busy} onPress={() => setMode('custom')} style={[styles.customBtn, { borderColor: Brand.purple }]}>
                  <Text style={{ color: Brand.purpleLight, fontWeight: '800', fontSize: 15 }}>＋ Create a custom section</Text>
                </Pressable>
                {error ? <Text style={styles.err}>{error}</Text> : null}
              </>
            ) : (
              <>
                <TextInput style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]} placeholder="Section name (e.g. Bouquet Toss)" placeholderTextColor={c.textTertiary} value={name} onChangeText={setName} autoFocus />
                <TextInput style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, minHeight: 72, textAlignVertical: 'top' }]} placeholder="Notes for your DJ (optional)" placeholderTextColor={c.textTertiary} value={notes} onChangeText={setNotes} multiline />

                <Text style={[styles.lab, { color: c.textTertiary, marginTop: Space.sm }]}>SONGS · {songs.length}/3</Text>
                {songs.map((s, i) => (
                  <View key={`${s.provider_id}-${i}`} style={[styles.songRow, { backgroundColor: c.cardAlt }]}>
                    {s.artwork_url ? <Image source={{ uri: s.artwork_url }} style={styles.art} /> : <View style={[styles.art, { backgroundColor: c.border }]} />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{s.title}</Text>
                      {s.artist ? <Text style={{ color: c.textTertiary, fontSize: 12 }} numberOfLines={1}>{s.artist}</Text> : null}
                    </View>
                    <Pressable hitSlop={8} onPress={() => setSongs((prev) => prev.filter((_, j) => j !== i))}><Text style={{ color: c.textTertiary, fontSize: 20 }}>✕</Text></Pressable>
                  </View>
                ))}

                {songs.length < 3 ? (
                  <>
                    <TextInput style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]} placeholder="Search a song to add…" placeholderTextColor={c.textTertiary} value={query} onChangeText={setQuery} autoCapitalize="none" />
                    {searching ? <ActivityIndicator color={Brand.purple} /> : null}
                    {results.slice(0, 6).map((t) => (
                      <Pressable key={`${t.provider}-${t.providerId}`} onPress={() => addSongToDraft(t)} style={[styles.songRow, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
                        {t.artworkUrl ? <Image source={{ uri: t.artworkUrl }} style={styles.art} /> : <View style={[styles.art, { backgroundColor: c.border }]} />}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{t.title}</Text>
                          <Text style={{ color: c.textTertiary, fontSize: 12 }} numberOfLines={1}>{t.artist}</Text>
                        </View>
                        <Text style={{ color: Brand.purpleLight, fontSize: 22 }}>＋</Text>
                      </Pressable>
                    ))}
                  </>
                ) : null}

                {error ? <Text style={styles.err}>{error}</Text> : null}
                <GradientButton label={busy ? 'Adding…' : 'Add section'} onPress={saveCustom} disabled={busy} style={{ marginTop: Space.md }} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingVertical: Space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  customBtn: { borderWidth: 1.5, borderRadius: Radius.lg, borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center', marginTop: Space.sm },
  input: { letterSpacing: 0, borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 14, fontSize: 16 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.md, padding: Space.sm },
  art: { width: 40, height: 40, borderRadius: 6 },
  err: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
});
