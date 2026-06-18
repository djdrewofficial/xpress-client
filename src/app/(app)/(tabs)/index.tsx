import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, type EventLite, type Group, type Overview } from '@/lib/planning';

const TILE_TONES = [
  { bg: '#EEEDFE', fg: '#3C3489', bar: '#534AB7' },
  { bg: '#E1F5EE', fg: '#0F6E56', bar: '#0F6E56' },
  { bg: '#FAEEDA', fg: '#854F0B', bar: '#BA7517' },
  { bg: '#FBEAF0', fg: '#993556', bar: '#993556' },
  { bg: '#FAECE7', fg: '#993C1D', bar: '#D85A30' },
  { bg: '#E6F1FB', fg: '#185FA5', bar: '#378ADD' },
];

export default function PlanScreen() {
  const c = useC();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [event, setEvent] = useState<EventLite | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEvent(ev);
    setOverview(ev ? await loadOverview(ev.id) : null);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;

  const pct = overview && overview.totalQuestions > 0 ? Math.round((overview.answeredQuestions / overview.totalQuestions) * 100) : 0;
  const dateLabel = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const nextUp = overview?.sections.find((s) => s.questionCount > 0 && s.answeredCount < s.questionCount);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl, gap: Space.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.purple} />}>
          <View style={styles.topRow}>
            <Text style={[styles.hi, { color: c.textSecondary }]}>Welcome back{profile?.firstName ? `, ${profile.firstName}` : ''}</Text>
            <Pressable onPress={signOut}><Text style={{ color: c.textTertiary, fontSize: 13 }}>Sign out</Text></Pressable>
          </View>

          {!event ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary }}>No event is linked to your account yet. Your DJ will set this up shortly.</Text>
            </View>
          ) : (
            <>
              <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                {dateLabel && <Text style={styles.heroDate}>{dateLabel.toUpperCase()}</Text>}
                <Text style={styles.heroTitle}>{event.name || 'Your Event'}</Text>
                <View style={styles.heroProgRow}>
                  <Text style={styles.heroPct}>{pct}%</Text>
                  <Text style={styles.heroSub}>{pct >= 80 ? "You're almost there!" : pct > 0 ? 'Looking great so far' : "Let's get started!"}</Text>
                </View>
                <View style={{ marginTop: Space.sm }}><Bar pct={pct} height={6} track="rgba(255,255,255,0.25)" /></View>
              </LinearGradient>

              {nextUp && (
                <View>
                  <Text style={[styles.lab, { color: c.textTertiary }]}>PICK UP WHERE YOU LEFT OFF</Text>
                  <Pressable onPress={() => router.push({ pathname: '/section/[id]', params: { id: nextUp.id, eventId: event.id } })}>
                    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: Space.md }]}>
                      <Text style={{ fontSize: 26 }}>{nextUp.icon ?? '🎵'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tileTitle, { color: c.text }]}>{nextUp.title}</Text>
                        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{nextUp.answeredCount}/{nextUp.questionCount} answered</Text>
                      </View>
                      <View style={styles.cta}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Continue</Text></View>
                    </View>
                  </Pressable>
                </View>
              )}

              <View>
                <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR PLAN</Text>
                <View style={styles.grid}>
                  {overview?.groups.map((g, i) => (
                    <GroupTile key={g.id} group={g} tone={TILE_TONES[i % TILE_TONES.length]} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id, eventId: event.id, title: g.title } })} />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GroupTile({ group, tone, onPress }: { group: Group; tone: { bg: string; fg: string; bar: string }; onPress: () => void }) {
  const pct = group.totalQuestions > 0 ? Math.round((group.answeredQuestions / group.totalQuestions) * 100) : group.songCount > 0 ? 100 : 0;
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={[styles.tileInner, { backgroundColor: tone.bg }]}>
        <View style={[styles.tileIcon, { backgroundColor: '#ffffffaa' }]}><Text style={{ fontSize: 20 }}>{group.icon ?? '•'}</Text></View>
        <Text style={[styles.tileName, { color: tone.fg }]} numberOfLines={2}>{group.title}</Text>
        <View style={{ height: 5, borderRadius: 5, backgroundColor: '#ffffff80', overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: tone.bar }} />
        </View>
        <Text style={{ color: tone.fg, fontSize: 11, opacity: 0.8, marginTop: 4 }}>
          {group.totalQuestions > 0 ? `${group.answeredQuestions}/${group.totalQuestions} answered` : `${group.sections.length} sections`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hi: { fontSize: 15 },
  hero: { borderRadius: Radius.xl, padding: Space.xl },
  heroDate: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  heroProgRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm, marginTop: Space.lg },
  heroPct: { color: '#fff', fontSize: 30, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1 },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: Space.sm },
  tileTitle: { fontSize: 16, fontWeight: '600' },
  cta: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Space.md },
  tile: { width: '48.5%' },
  tileInner: { borderRadius: Radius.lg, padding: Space.lg, minHeight: 130, justifyContent: 'space-between' },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: Space.sm },
  tileName: { fontSize: 15, fontWeight: '700', marginBottom: Space.sm, flex: 1 },
});
