import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

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
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={{ color: Brand.purpleLight, fontSize: 16, fontWeight: '600' }}>‹</Text>
            <Text style={{ color: Brand.purpleLight, fontSize: 16 }}>Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.md }}>
          <Text style={[styles.title, { color: c.text }]}>{title ?? 'Sections'}</Text>
          {!sections ? (
            <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.xl }} />
          ) : (
            sections.map((s) => {
              const complete = s.questionCount > 0 && s.answeredCount === s.questionCount;
              const pct = s.questionCount > 0 ? Math.round((s.answeredCount / s.questionCount) * 100) : s.songCount > 0 ? 100 : 0;
              const subtitle = s.questionCount > 0
                ? (complete ? 'All answered' : `${s.answeredCount} of ${s.questionCount} answered`)
                : s.songCount > 0 ? `${s.songCount} song${s.songCount === 1 ? '' : 's'}` : 'Tap to open';
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/section/[id]', params: { id: s.id, eventId } })}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
                  <View style={[styles.row, Shadow.card, { backgroundColor: c.card, borderColor: complete ? Brand.purple + '55' : c.border }]}>
                    <View style={[styles.icon, { backgroundColor: c.cardAlt }]}><Text style={{ fontSize: 22 }}>{s.icon ?? '•'}</Text></View>
                    <View style={{ flex: 1, gap: 7 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                      {s.questionCount > 0 && <Bar pct={pct} height={5} track={c.cardAlt} />}
                      <Text style={{ color: complete ? '#22c55e' : c.textTertiary, fontSize: 12, fontWeight: '600' }}>
                        {complete ? '✓ ' : ''}{subtitle}
                      </Text>
                    </View>
                    <Text style={{ color: c.textTertiary, fontSize: 22, marginLeft: 4 }}>›</Text>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: Space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
