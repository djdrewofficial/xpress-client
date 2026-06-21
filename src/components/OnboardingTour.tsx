import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, Radius, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

/* First-run walkthrough. Full-screen, swipeable slides that explain the app —
   each slide has an icon, a short explanation, and (where helpful) a little
   mock control + arrow pointing to where the feature lives. Shown once; the
   caller persists "seen" and can re-open it from a help button. */

type Slide = { icon: string; title: string; body: string; mock?: { label: string; caption: string } };

export function OnboardingTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [i, setI] = useState(0);
  const [h, setH] = useState(0);

  const isGuest = profile?.accountType === 'event_guest';
  const canManage = profile?.accountType === 'staff' || profile?.accountType === 'client';
  const name = profile?.firstName ? `, ${profile.firstName}` : '';

  const slides: Slide[] = [
    {
      icon: '👋',
      title: `Welcome${name}!`,
      body: "Let's take a quick tour so you can plan every detail of your big day right from your phone.",
    },
    {
      icon: '🗂️',
      title: 'Your plan, organized',
      body: 'Everything is split into simple sections. On the Home screen, tap a category card to open its sections.',
      mock: { label: '✨  Your Plan', caption: 'Tap a category on Home' },
    },
    {
      icon: '✅',
      title: 'Answer a few questions',
      body: 'Open a section and tap your answers — they save automatically as you go. Watch your progress fill up!',
    },
    ...(!isGuest
      ? [
          {
            icon: '🎵',
            title: 'Add your music',
            body: 'In a music section, tap “Add music” to search Spotify, Apple Music & YouTube — then tap a song to add it.',
            mock: { label: '＋ Add music', caption: 'Inside a music section' },
          } as Slide,
          {
            icon: '⭐',
            title: 'Must-play & do-not-play',
            body: 'Mark the songs you love as must-play, or add songs to your do-not-play list so we know what to skip.',
          } as Slide,
          {
            icon: '📸',
            title: 'Design your photo booth',
            body: 'Pick a backdrop and a photo-strip design — tap a design to preview it, then “Use This Design”.',
          } as Slide,
        ]
      : []),
    ...(canManage
      ? [
          {
            icon: '↕️',
            title: 'Rearrange & manage',
            body: 'Tap “Edit” on a section list to reorder sections with the arrows, remove ones you don\'t need, or restore removed ones.',
            mock: { label: 'Edit', caption: 'Top-right of a section list' },
          } as Slide,
        ]
      : []),
    {
      icon: '🎉',
      title: "You're all set!",
      body: 'That\'s the tour. You can reopen it anytime from the “?” button on your Home screen. Let\'s make it amazing!',
    },
  ];

  const last = i >= slides.length - 1;
  const goTo = (n: number) => {
    ref.current?.scrollTo({ x: n * width, animated: true });
    setI(n);
  };
  const next = () => (last ? onClose() : goTo(i + 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient colors={[Brand.purple, '#241541']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

        {/* Skip */}
        <View style={styles.topRow}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.skip}>
            <Text style={styles.skipTxt}>Skip</Text>
          </Pressable>
        </View>

        {/* Slides */}
        <View style={{ flex: 1 }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
          {h > 0 && (
            <ScrollView
              ref={ref}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {slides.map((s, idx) => (
                <View key={idx} style={{ width, height: h, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.xl }}>
                  <View style={styles.iconWrap}>
                    <Text style={{ fontSize: 60 }}>{s.icon}</Text>
                  </View>
                  <Text style={styles.title}>{s.title}</Text>
                  <Text style={styles.body}>{s.body}</Text>

                  {s.mock && (
                    <View style={styles.mockWrap}>
                      <View style={styles.mockPill}>
                        <Text style={styles.mockPillTxt}>{s.mock.label}</Text>
                      </View>
                      <Text style={styles.arrow}>↑</Text>
                      <Text style={styles.mockCaption}>{s.mock.caption}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === i ? styles.dotActive : null]} />
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={() => goTo(Math.max(0, i - 1))} disabled={i === 0} hitSlop={8} style={{ opacity: i === 0 ? 0 : 1 }}>
            <Text style={styles.backTxt}>Back</Text>
          </Pressable>
          <Pressable onPress={next} style={styles.nextBtn}>
            <Text style={styles.nextTxt}>{last ? 'Get started' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Space.xxl + Space.lg, paddingHorizontal: Space.lg },
  skip: { paddingHorizontal: 12, paddingVertical: 6 },
  skipTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: Space.xl },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3, marginBottom: Space.md },
  body: { color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  mockWrap: { alignItems: 'center', marginTop: Space.xl },
  mockPill: { backgroundColor: '#fff', borderRadius: Radius.pill, paddingVertical: 11, paddingHorizontal: 22 },
  mockPillTxt: { color: Brand.purple, fontWeight: '800', fontSize: 15 },
  arrow: { color: 'rgba(255,255,255,0.9)', fontSize: 24, fontWeight: '800', marginTop: 6 },
  mockCaption: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingBottom: Space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 22, backgroundColor: '#fff' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.xl, paddingBottom: Space.xxl + Space.md, paddingTop: Space.sm },
  backTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  nextBtn: { backgroundColor: '#fff', borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 36 },
  nextTxt: { color: Brand.purple, fontWeight: '800', fontSize: 16 },
});
