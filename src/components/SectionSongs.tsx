import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { resolvePreview } from '@/lib/musicSearch';
import { removeSong, setDoNotPlay, setMustPlay, updateSongNote, type SongRow } from '@/lib/planning';

const RED = '#e0584f';
const GOLD = '#d9a521';

export function SectionSongs({
  songs,
  setSongs,
  allowMustPlay = true,
  allowDoNotPlay = false,
}: {
  songs: SongRow[];
  setSongs: (fn: (prev: SongRow[]) => SongRow[]) => void;
  allowMustPlay?: boolean;
  allowDoNotPlay?: boolean;
}) {
  const c = useC();
  const player = useAudioPlayer(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  const patch = useCallback((id: string, p: Partial<SongRow>) => setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))), [setSongs]);

  const togglePlay = useCallback(async (s: SongRow) => {
    if (playingId === s.id) { try { player.pause(); } catch {} setPlayingId(null); return; }
    let url = s.preview_url;
    if (!url) url = await resolvePreview(s.title, s.artist ?? '');
    if (!url) { setPlayingId(null); return; }
    try { player.replace({ uri: url }); player.seekTo(0); player.play(); setPlayingId(s.id); } catch { setPlayingId(null); }
  }, [playingId, player]);

  const onMust = (s: SongRow) => { const v = !s.must_play; patch(s.id, { must_play: v, do_not_play: v ? false : s.do_not_play }); setMustPlay(s.id, v); };
  const onDnp = (s: SongRow) => { const v = !s.do_not_play; patch(s.id, { do_not_play: v, must_play: v ? false : s.must_play }); setDoNotPlay(s.id, v); };
  const onRemove = (s: SongRow) => { setSongs((prev) => prev.filter((x) => x.id !== s.id)); removeSong(s.id); };
  const openNote = (s: SongRow) => { setEditing(s.id); setDraft(s.note ?? ''); };
  const saveNote = (s: SongRow) => { patch(s.id, { note: draft.trim() || null }); updateSongNote(s.id, draft); setEditing(null); };

  return (
    <View style={{ gap: Space.sm }}>
      {songs.map((s) => (
        <View key={s.id} style={[styles.card, { backgroundColor: c.card, borderColor: s.do_not_play ? RED + '66' : c.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
            <Pressable onPress={() => togglePlay(s)} style={styles.artWrap}>
              {s.artwork_url ? (
                <Image source={{ uri: s.artwork_url }} style={styles.art} />
              ) : (
                <View style={[styles.art, { backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }]}><Text>🎵</Text></View>
              )}
              <View style={styles.playOverlay}><Text style={{ color: '#fff', fontSize: 15 }}>{playingId === s.id ? '⏸' : '▶'}</Text></View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 14, textDecorationLine: s.do_not_play ? 'line-through' : 'none' }} numberOfLines={1}>{s.title}</Text>
              <Text style={{ color: c.textSecondary, fontSize: 13 }} numberOfLines={1}>{s.artist}</Text>
            </View>
            <Pressable onPress={() => onRemove(s)} hitSlop={10} style={{ padding: 4 }}><Text style={{ color: c.textTertiary, fontSize: 16 }}>✕</Text></Pressable>
          </View>

          {s.note && editing !== s.id ? (
            <Pressable onPress={() => openNote(s)} style={[styles.noteBox, { backgroundColor: c.cardAlt }]}>
              <Text style={{ color: c.textSecondary, fontSize: 13, fontStyle: 'italic' }}>“{s.note}”</Text>
            </Pressable>
          ) : null}

          {editing === s.id ? (
            <View style={{ gap: Space.sm }}>
              <TextInput
                style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }]}
                value={draft}
                onChangeText={setDraft}
                placeholder="Add a note (dedication, timing, instructions…)"
                placeholderTextColor={c.textTertiary}
                multiline
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: Space.sm }}>
                <Pressable onPress={() => setEditing(null)} style={[styles.smallBtn, { backgroundColor: c.cardAlt }]}><Text style={{ color: c.textSecondary, fontWeight: '600' }}>Cancel</Text></Pressable>
                <Pressable onPress={() => saveNote(s)} style={[styles.smallBtn, { backgroundColor: Brand.purple }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Save note</Text></Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.chips}>
              {allowMustPlay && <Toggle label="⭐ Must play" active={s.must_play} color={GOLD} onPress={() => onMust(s)} c={c} />}
              {allowDoNotPlay && <Toggle label="🚫 Do not play" active={s.do_not_play} color={RED} onPress={() => onDnp(s)} c={c} />}
              <Toggle label={s.note ? '📝 Edit note' : '📝 Note'} active={false} color={Brand.purple} onPress={() => openNote(s)} c={c} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function Toggle({ label, active, color, onPress, c }: { label: string; active: boolean; color: string; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: color + '22', borderColor: color } : { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Text style={{ color: active ? color : c.textSecondary, fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, borderWidth: 1, padding: Space.sm, gap: Space.sm },
  artWrap: { width: 46, height: 46, borderRadius: 8, overflow: 'hidden' },
  art: { width: 46, height: 46, borderRadius: 8 },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  noteBox: { borderRadius: Radius.sm, padding: Space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  input: { letterSpacing: 0, borderWidth: 1, borderRadius: Radius.md, padding: Space.md, fontSize: 14, minHeight: 64, textAlignVertical: 'top' },
  smallBtn: { borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
});
