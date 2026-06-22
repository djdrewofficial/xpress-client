import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';

import { Ring, useC, useScheme } from '@/components/ui';
import { OnboardingTour } from '@/components/OnboardingTour';
import { Logo } from '@/components/Logo';
import { pickCoverImage, uploadCoverPhoto } from '@/lib/coverPhoto';
import { Brand, Fonts, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents, loadOverview, type EventLite, type Group, type Overview } from '@/lib/planning';

const TOUR_KEY = 'onboarding_seen_v1';

export default function PlanScreen() {
  const c = useC();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [event, setEvent] = useState<EventLite | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const tourChecked = useRef(false);

  // First run after sign-in: show the walkthrough once (per device).
  useEffect(() => {
    if (tourChecked.current || !profile) return;
    tourChecked.current = true;
    AsyncStorage.getItem(TOUR_KEY).then((v) => { if (!v) setShowTour(true); }).catch(() => {});
  }, [profile]);
  const closeTour = useCallback(() => {
    setShowTour(false);
    AsyncStorage.setItem(TOUR_KEY, '1').catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEvent(ev);
    setOverview(ev ? await loadOverview(ev.id) : null);
    setLoading(false);
  }, [profile]);

  // refetch progress every time the screen regains focus (e.g. after answering)
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const onChangePhoto = useCallback(async () => {
    if (!event) return;
    try {
      const asset = await pickCoverImage();
      if (!asset) return;
      setUploading(true);
      await uploadCoverPhoto(event.id, asset);
      await load();
    } catch (e) {
      Alert.alert('Could not update photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }, [event, load]);

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
        <ScrollView
          contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 3, gap: Space.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.purple} />}>
          {!event ? (
            <>
              <View style={styles.topRow}>
                <Logo variant="full" height={30} />
                <Pressable onPress={signOut}><Text style={{ color: c.textTertiary, fontSize: 13 }}>Sign out</Text></Pressable>
              </View>
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={{ color: c.textSecondary }}>No event is linked to your account yet. Your DJ will set this up shortly.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.hero, Shadow.card]}>
                {event.cover_photo_url ? (
                  <Image source={{ uri: event.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <LinearGradient colors={[Brand.purple, '#6a4fb8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient
                  colors={event.cover_photo_url
                    ? ['rgba(18,10,38,0.45)', 'rgba(18,10,38,0.20)', 'rgba(8,4,20,0.88)']
                    : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.18)']}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.heroTopRow}>
                  <Logo variant="full" height={30} tone="#ffffff" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
                    <Pressable onPress={() => setShowTour(true)} hitSlop={8} style={styles.camBtn}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>?</Text>
                    </Pressable>
                    <Pressable onPress={onChangePhoto} disabled={uploading} hitSlop={8} style={styles.camBtn}>
                      {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15 }}>📷</Text>}
                    </Pressable>
                    <Pressable onPress={signOut} hitSlop={8}>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Sign out</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ flex: 1, minHeight: Space.xl }} />

                <Text style={styles.heroWelcome}>Welcome back{profile?.firstName ? `, ${profile.firstName}` : ''}</Text>
                {dateLabel && <Text style={styles.heroDate}>{dateLabel.toUpperCase()}</Text>}
                <Text style={styles.heroTitle}>{event.name || 'Your Event'}</Text>
                {countdown != null && countdown >= 0 && (
                  <View style={styles.countPill}>
                    <Text style={styles.countNum}>{countdown}</Text>
                    <Text style={styles.countLab}>{countdown === 1 ? 'day to go' : 'days to go'}</Text>
                  </View>
                )}
                <View style={styles.heroProgRow}>
                  <Ring pct={pct} size={78} stroke={7} color="#fff" track="rgba(255,255,255,0.28)" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroCheer}>{pct >= 80 ? "You're almost there!" : pct > 0 ? 'Looking great so far' : "Let's get started!"}</Text>
                    {overview && overview.totalQuestions > 0 && (
                      <Text style={styles.heroSub}>{overview.answeredQuestions} of {overview.totalQuestions} questions answered</Text>
                    )}
                  </View>
                </View>

                {!event.cover_photo_url && (
                  <Pressable onPress={onChangePhoto} disabled={uploading} style={styles.addPhotoHint} hitSlop={6}>
                    <Text style={styles.addPhotoHintText}>📷  Add a photo of you two</Text>
                  </Pressable>
                )}
              </View>

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
                    index={i}
                    onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id, eventId: event.id, title: g.title } })}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <OnboardingTour visible={showTour} onClose={closeTour} />
    </View>
  );
}

function CategoryCard({ group, index, onPress }: { group: Group; index: number; onPress: () => void }) {
  const c = useC();
  const dark = useScheme() === 'dark';
  const glassFill = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)';
  const glassBorder = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)';
  const pct = group.totalQuestions > 0
    ? Math.round((group.answeredQuestions / group.totalQuestions) * 100)
    : group.songCount > 0 ? 100 : 0;
  const done = pct >= 100;
  const meta = [
    `${group.sections.length} ${group.sections.length === 1 ? 'section' : 'sections'}`,
    group.songCount > 0 ? `${group.songCount} ${group.songCount === 1 ? 'song' : 'songs'}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={[styles.catShadow, Shadow.card]}>
        <BlurView intensity={dark ? 36 : 60} tint={dark ? 'dark' : 'light'} style={[styles.cat, { borderColor: glassBorder }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
          <View style={styles.catHead}>
          <Text style={[styles.catEyebrow, { color: done ? Brand.red : Brand.purpleLight }]}>
            {done ? '✓ COMPLETE' : `STEP ${index + 1}`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.catPct, { color: c.textTertiary }]}>{pct}%</Text>
        </View>

        <View style={styles.catTitleRow}>
          <Text style={[styles.catTitle, { color: c.text }]} numberOfLines={2}>{group.title}</Text>
          <View style={[styles.catChevron, { backgroundColor: Brand.purple + '14' }]}>
            <Text style={{ color: Brand.purpleLight, fontSize: 22, fontWeight: '700', marginTop: -2 }}>›</Text>
          </View>
        </View>
        <Text style={[styles.catMeta, { color: c.textTertiary }]}>{meta}</Text>

        <View style={[styles.catBarTrack, { backgroundColor: c.cardAlt }]}>
          {pct > 0 && (
            <LinearGradient
              colors={[Brand.purple, Brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.catBarFill, { width: `${Math.max(3, pct)}%` }]}
            />
          )}
          </View>
        </BlurView>
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
  hero: { borderRadius: Radius.xl, padding: Space.xl, overflow: 'hidden', minHeight: 320 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  camBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  heroWelcome: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  addPhotoHint: { marginTop: Space.md, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
  addPhotoHintText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroDate: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 32, fontFamily: Fonts.display, marginTop: 4 },
  countPill: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: Space.md, backgroundColor: Brand.red, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  countNum: { color: '#fff', fontWeight: '800', fontSize: 16 },
  countLab: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  heroProgRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginTop: Space.lg },
  heroCheer: { color: '#fff', fontSize: 17, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: Space.sm },
  contTitle: { fontSize: 16, fontWeight: '600' },
  cta: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },

  catShadow: { borderRadius: Radius.xl },
  cat: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Space.xl, gap: 6, overflow: 'hidden' },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  catEyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  catPct: { fontSize: 13, fontWeight: '700' },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginTop: 2 },
  catTitle: { flex: 1, fontSize: 26, fontFamily: Fonts.display, letterSpacing: -0.3 },
  catChevron: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  catMeta: { fontSize: 13, fontWeight: '500', marginBottom: Space.sm },
  catBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 7, borderRadius: 4 },
});
