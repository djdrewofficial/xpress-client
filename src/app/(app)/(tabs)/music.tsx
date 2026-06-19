import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, type SectionRow } from '@/lib/planning';

export default function MusicScreen() {
  const c = useC();
  const router = useRouter();
  const { profile } = useAuth();
  const [eventId, setEventId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRow[] | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEventId(ev?.id ?? null);
    if (ev) {
      const ov = await loadOverview(ev.id);
      setSections(ov.sections.filter((s) => s.songs_enabled));
    } else setSections([]);
  }, [profile]);
  useEffect(() => { load(); }, [load]);

  const totalSongs = (sections ?? []).reduce((n, s) => n + s.songCount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.md }}>
          <Text style={[styles.title, { color: c.text }]}>Music</Text>

          <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.aiHero, Shadow.card]}>
            <Text style={styles.aiTag}>✨ AI PICKS</Text>
            <Text style={styles.aiTitle}>Songs chosen for you</Text>
            <Text style={styles.aiSub}>Open any moment below — we suggest tracks based on your story and cultural influences, so every set feels like yours.</Text>
            {totalSongs > 0 && <Text style={styles.aiCount}>{totalSongs} song{totalSongs === 1 ? '' : 's'} picked so far</Text>}
          </LinearGradient>

          <Text style={[styles.lab, { color: c.textTertiary }]}>EVERY MOMENT OF YOUR NIGHT</Text>
          {!sections ? (
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800' },
  aiHero: { borderRadius: Radius.xl, padding: Space.xl, gap: 4 },
  aiTag: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  aiTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  aiSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  aiCount: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: Space.sm },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
  rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
