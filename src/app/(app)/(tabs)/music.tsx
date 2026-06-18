import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.sm }}>
          <Text style={[styles.title, { color: c.text }]}>Music</Text>
          <Text style={{ color: c.textSecondary, marginBottom: Space.sm }}>Pick the songs for every moment of your night.</Text>
          {!sections ? (
            <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
          ) : (
            sections.map((s) => (
              <Pressable key={s.id} onPress={() => eventId && router.push({ pathname: '/section/[id]', params: { id: s.id, eventId } })}>
                <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={{ fontSize: 24 }}>{s.icon ?? '🎵'}</Text>
                  <Text style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: '600' }}>{s.title}</Text>
                  <Text style={{ color: c.textTertiary, fontSize: 13 }}>{s.songCount} song{s.songCount === 1 ? '' : 's'}{s.song_limit != null ? ` / ${s.song_limit}` : ''}</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
});
