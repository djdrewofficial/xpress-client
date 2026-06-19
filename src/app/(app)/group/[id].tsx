import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { loadOverview, type SectionRow } from '@/lib/planning';

export default function GroupScreen() {
  const c = useC();
  const router = useRouter();
  const { id, eventId, title } = useLocalSearchParams<{ id: string; eventId: string; title: string }>();
  const [sections, setSections] = useState<SectionRow[] | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const ov = await loadOverview(eventId);
    setSections(ov.groups.find((g) => g.id === id)?.sections ?? []);
  }, [eventId, id]);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ color: Brand.purpleLight, fontSize: 16 }}>‹ Back</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.sm }}>
          <Text style={[styles.title, { color: c.text }]}>{title ?? 'Sections'}</Text>
          {!sections ? (
            <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
          ) : (
            sections.map((s) => {
              const complete = s.questionCount > 0 && s.answeredCount === s.questionCount;
              const pct = s.questionCount > 0 ? Math.round((s.answeredCount / s.questionCount) * 100) : s.songCount > 0 ? 100 : 0;
              return (
                <Pressable key={s.id} onPress={() => router.push({ pathname: '/section/[id]', params: { id: s.id, eventId } })} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
                  <View style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={[styles.icon, { backgroundColor: c.cardAlt }]}><Text style={{ fontSize: 22 }}>{s.icon ?? '•'}</Text></View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                      <Bar pct={pct} height={5} />
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {s.questionCount > 0 && <Text style={{ color: complete ? '#16a34a' : c.textTertiary, fontSize: 12, fontWeight: '700' }}>{complete ? '✓ ' : ''}{s.answeredCount}/{s.questionCount}</Text>}
                      {s.songCount > 0 && <Text style={{ color: c.textTertiary, fontSize: 12 }}>🎵 {s.songCount}</Text>}
                    </View>
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
  header: { paddingHorizontal: Space.lg, paddingVertical: Space.md },
  title: { fontSize: 26, fontWeight: '800', marginBottom: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
