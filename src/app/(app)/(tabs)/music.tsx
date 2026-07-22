import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { Backdrop } from '@/components/Backdrop';
import { AppHeader } from '@/components/AppHeader';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useEvent } from '@/lib/events';
import { loadOverview, onMusic, type SectionRow } from '@/lib/planning';

export default function MusicScreen() {
  const c = useC();
  const router = useRouter();
  const { eventId, loading: eventLoading } = useEvent();
  const [sections, setSections] = useState<SectionRow[] | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setSections([]);
      return;
    }
    const ov = await loadOverview(eventId);
    setSections(ov.sections.filter(onMusic));
  }, [eventId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalSongs = (sections ?? []).reduce((n, s) => n + s.songCount, 0);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <AppHeader />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 3, gap: Space.md }}>
          <Text style={[styles.title, { color: c.text }]}>Music</Text>

          <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.aiHero, Shadow.card]}>
            <Text style={styles.aiTag}>✨ FOR YOU</Text>
            <Text style={styles.aiTitle}>Songs picked for you</Text>
            <Text style={styles.aiSub}>Open any moment below — we suggest tracks based on your story and cultural influences, so every set feels like yours.</Text>
            {totalSongs > 0 && <Text style={styles.aiCount}>{totalSongs} song{totalSongs === 1 ? '' : 's'} picked so far</Text>}
          </LinearGradient>

          <View style={[styles.note, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ color: c.textSecondary, fontSize: 13.5, lineHeight: 20 }}>
              There&apos;s no pressure to fill these playlists all the way up. Even a general sense of the vibe — or just a few songs — gives us plenty to work with. What matters most is sharing what you and your guests love, especially your cultural influences and the music that means something to you.
            </Text>
          </View>

          <Text style={[styles.lab, { color: c.textTertiary }]}>VIBE CURATION</Text>
          {eventLoading || !sections ? (
            <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
          ) : sections.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>No song moments yet — your DJ will add these to your plan.</Text>
          ) : (
            sections.map((s) => {
              const pct = s.song_limit ? Math.min(100, Math.round((s.songCount / s.song_limit) * 100)) : s.songCount > 0 ? 100 : 0;
              return (
                <Pressable key={s.id} onPress={() => eventId && router.push({ pathname: '/section/[id]', params: { id: s.id, eventId } })}>
                  <View style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={[styles.rowIcon, { backgroundColor: c.cardAlt }]}><Text style={{ fontSize: 22 }}>{s.icon ?? '🎵'}</Text></View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                      <Bar pct={pct} height={5} />
                      <Text style={{ color: c.textTertiary, fontSize: 12 }}>
                        {s.songCount} song{s.songCount === 1 ? '' : 's'}{s.song_limit != null ? ` of ${s.song_limit}` : ' added'}
                      </Text>
                    </View>
                    <Text style={{ color: Brand.purpleLight, fontSize: 22 }}>›</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontFamily: Fonts.display },
  aiHero: { borderRadius: Radius.xl, padding: Space.xl, gap: 4 },
  aiTag: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  aiTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  aiSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  aiCount: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: Space.sm },
  note: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
  rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
