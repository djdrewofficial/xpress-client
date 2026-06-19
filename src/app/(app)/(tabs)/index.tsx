import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Bar, Ring, Sparkle, useC, useScheme } from '@/components/ui';
import { BrandHeader } from '@/components/Logo';
import { Brand, CategoryThemes, Radius, Shadow, Space, type CategoryTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, type EventLite, type Group, type Overview } from '@/lib/planning';

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
  const countdown = event?.event_date ? daysUntil(event.event_date) : null;
  const dateLabel = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const nextUp = overview?.sections.find((s) => s.questionCount > 0 && s.answeredCount < s.questionCount);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <BrandHeader />
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
              <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, Shadow.card]}>
                {dateLabel && <Text style={styles.heroDate}>{dateLabel.toUpperCase()}</Text>}
                <Text style={styles.heroTitle}>{event.name || 'Your Event'}</Text>
                {countdown != null && countdown >= 0 && (
                  <View style={styles.countPill}>
                    <Text style={styles.countNum}>{countdown}</Text>
                    <Text style={styles.countLab}>{countdown === 1 ? 'day to go' : 'days to go'}</Text>
                  </View>
                )}
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
                    <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: Space.md }]}>
                      <Text style={{ fontSize: 26 }}>{nextUp.icon ?? '🎵'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contTitle, { color: c.text }]}>{nextUp.title}</Text>
                        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{nextUp.answeredCount}/{nextUp.questionCount} answered</Text>
                      </View>
                      <View style={styles.cta}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Continue</Text></View>
                    </View>
                  </Pressable>
                </View>
              )}

              <View style={{ gap: Space.md }}>
                <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR PLAN</Text>
                {overview?.groups.map((g, i) => (
                  <CategoryCard
                    key={g.id}
                    group={g}
                    theme={CategoryThemes[i % CategoryThemes.length]}
                    onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id, eventId: event.id, title: g.title } })}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function CategoryCard({ group, theme, onPress }: { group: Group; theme: CategoryTheme; onPress: () => void }) {
  const c = useC();
  const scheme = useScheme();
  const dark = scheme === 'dark';
  const bg = dark ? theme.tintDark : theme.tint;
  const fg = dark ? theme.grad[1] : theme.accent;

  const pct = group.totalQuestions > 0
    ? Math.round((group.answeredQuestions / group.totalQuestions) * 100)
    : group.songCount > 0 ? 100 : 0;

  const peek = group.sections.slice(0, 3);
  const moreCount = group.sections.length - peek.length;
  const meta = [
    `${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`,
    group.songCount > 0 ? `${group.songCount} ${group.songCount === 1 ? 'song' : 'songs'}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={[styles.cat, Shadow.card, { backgroundColor: bg }]}>
        <View style={styles.catTop}>
          <LinearGradient colors={[theme.grad[0], theme.grad[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catIcon}>
            <Text style={{ fontSize: 24 }}>{group.icon ?? '✨'}</Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.catTitle, { color: dark ? c.text : '#1c1630' }]} numberOfLines={2}>{group.title}</Text>
            <Text style={{ color: fg, fontSize: 12.5, fontWeight: '600', opacity: 0.9 }}>{meta}</Text>
          </View>
          <Ring pct={pct} size={54} stroke={6} color={fg} track={fg + '24'} />
        </View>

        {peek.length > 0 && (
          <View style={styles.chips}>
            {peek.map((s) => (
              <View key={s.id} style={[styles.chip, { backgroundColor: dark ? '#ffffff14' : '#ffffffcc' }]}>
                <Text style={{ fontSize: 12 }}>{s.icon ?? '•'}</Text>
                <Text style={[styles.chipTxt, { color: dark ? c.textSecondary : '#3a3450' }]} numberOfLines={1}>{s.title}</Text>
              </View>
            ))}
            {moreCount > 0 && (
              <View style={[styles.chip, { backgroundColor: dark ? '#ffffff14' : '#ffffffcc' }]}>
                <Text style={[styles.chipTxt, { color: fg }]}>+{moreCount} more</Text>
              </View>
            )}
          </View>
        )}

        {group.aiPicks && (
          <View style={{ marginTop: Space.md }}>
            <Sparkle label="For You picks" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hi: { fontSize: 15 },
  hero: { borderRadius: Radius.xl, padding: Space.xl },
  heroDate: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  countPill: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: Space.md, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  countNum: { color: '#fff', fontWeight: '800', fontSize: 16 },
  countLab: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  heroProgRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm, marginTop: Space.lg },
  heroPct: { color: '#fff', fontSize: 30, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flex: 1 },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: Space.sm },
  contTitle: { fontSize: 16, fontWeight: '600' },
  cta: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },

  cat: { borderRadius: Radius.xl, padding: Space.lg },
  catTop: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  catIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.pill, maxWidth: '100%' },
  chipTxt: { fontSize: 12, fontWeight: '600' },
});
