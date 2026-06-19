import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Sparkle, useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { getRecommendations, type RecommendedSong, type RecResult } from '@/lib/recommendations';

/**
 * "✨ Curated for you" — AI song picks for one moment, grounded in the couple's
 * About Us + Cultural Influence. Renders its own loading / empty / personalize
 * states so it can drop into any section that takes songs.
 */
export function AiPicks({
  eventId,
  eventName,
  sectionTitle,
  existingTitles,
  onAdd,
}: {
  eventId: string;
  eventName: string;
  sectionTitle: string;
  existingTitles: Set<string>;
  onAdd: (s: RecommendedSong) => Promise<void>;
}) {
  const c = useC();
  const [result, setResult] = useState<RecResult | null>(null);
  const [adding, setAdding] = useState<Record<string, 'busy' | 'done'>>({});

  const load = useCallback(async () => {
    setResult(null);
    setResult(await getRecommendations({ eventId, eventName, sectionTitle }));
  }, [eventId, eventName, sectionTitle]);
  useEffect(() => { load(); }, [load]);

  // Stay quiet if the API isn't wired up yet — no broken-looking UI for the couple.
  if (result?.status === 'unconfigured' || result?.status === 'error') return null;

  return (
    <View style={[styles.wrap, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.head}>
        <Sparkle label="Curated for you" />
        {result?.status === 'ok' && (
          <Pressable onPress={load} hitSlop={8}><Text style={{ color: Brand.purpleLight, fontSize: 13, fontWeight: '600' }}>Refresh</Text></Pressable>
        )}
      </View>

      {!result ? (
        <View style={styles.pad}><ActivityIndicator color={Brand.purple} /></View>
      ) : result.status === 'needs-profile' ? (
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          Tell us about yourselves in <Text style={{ fontWeight: '700' }}>About Us</Text> and your{' '}
          <Text style={{ fontWeight: '700' }}>Cultural Influence</Text> — we'll hand-pick songs that fit your story.
        </Text>
      ) : result.songs.length === 0 ? (
        <Text style={[styles.hint, { color: c.textSecondary }]}>No picks just yet — check back after you add more about yourselves.</Text>
      ) : (
        <>
          {result.basis.length > 0 && (
            <Text style={[styles.basis, { color: c.textTertiary }]}>Because of {result.basis.join(', ')}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm, paddingTop: Space.sm }}>
            {result.songs.map((s) => {
              const key = `${s.title}__${s.artist ?? ''}`;
              const state = adding[key] ?? (existingTitles.has(s.title.toLowerCase()) ? 'done' : undefined);
              return (
                <View key={s.id} style={[styles.songCard, { backgroundColor: c.cardAlt }]}>
                  {s.artwork_url ? (
                    <Image source={{ uri: s.artwork_url }} style={styles.art} />
                  ) : (
                    <View style={[styles.art, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }]}><Text>🎵</Text></View>
                  )}
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 13, marginTop: 6 }} numberOfLines={1}>{s.title}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 12 }} numberOfLines={1}>{s.artist}</Text>
                  {s.reason ? <Text style={{ color: c.textTertiary, fontSize: 11, marginTop: 4 }} numberOfLines={2}>{s.reason}</Text> : null}
                  <Pressable
                    disabled={state != null}
                    onPress={async () => {
                      setAdding((p) => ({ ...p, [key]: 'busy' }));
                      try { await onAdd(s); setAdding((p) => ({ ...p, [key]: 'done' })); }
                      catch { setAdding((p) => { const n = { ...p }; delete n[key]; return n; }); }
                    }}
                    style={{ marginTop: 8 }}>
                    {state === 'done' ? (
                      <View style={[styles.addBtn, { backgroundColor: '#16a34a22' }]}><Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>✓ Added</Text></View>
                    ) : state === 'busy' ? (
                      <View style={[styles.addBtn, { backgroundColor: c.card }]}><ActivityIndicator size="small" color={Brand.purple} /></View>
                    ) : (
                      <LinearGradient colors={[Brand.purple, Brand.purpleLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pad: { paddingVertical: Space.lg, alignItems: 'center' },
  hint: { fontSize: 13, lineHeight: 19, marginTop: Space.sm },
  basis: { fontSize: 12, fontStyle: 'italic', marginTop: Space.sm },
  songCard: { width: 130, borderRadius: Radius.md, padding: Space.sm },
  art: { width: '100%', height: 114, borderRadius: 10 },
  addBtn: { borderRadius: Radius.pill, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
});
