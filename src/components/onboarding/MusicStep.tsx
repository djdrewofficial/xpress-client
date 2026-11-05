import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { ProviderLogo } from '@/components/ProviderLogo';
import { Button, Icon, useC, useScheme } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Brand, Fonts, Radius, Shadow, Type } from '@/lib/theme';

const STEPS: { n: string; label: TranslationKey }[] = [
  { n: '01', label: 'music.stepWelcome' },
  { n: '02', label: 'music.stepMusic' },
  { n: '03', label: 'music.stepTimeline' },
  { n: '04', label: 'music.stepDj' },
];

/** Onboarding 2 — music intro. Sample track is teaching art, not the couple's library. */
export function MusicStep({ onSkip, onContinue }: { onSkip: () => void; onContinue: () => void }) {
  const c = useC();
  const scheme = useScheme();
  const { t } = useT();
  const title = t('music.title');
  const [before, after = ''] = title.split('{{accent}}');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.top}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
          <Text style={[Type.callout, { color: c.ink2 }]}>{t('music.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stage}>
          <Record />
          <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.index, { color: c.red }]}>02</Text>
              <LinearGradient colors={[Brand.purple, Brand.red]} style={styles.art}>
                <Icon name="waveform" size={22} color="#ffffff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.trackTitle, { color: c.ink }]} numberOfLines={1}>
                  {t('music.sampleTitle')}
                </Text>
                <View style={styles.artistRow}>
                  <ProviderLogo provider="spotify" size={14} />
                  <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
                    {t('music.sampleArtist')}
                  </Text>
                </View>
              </View>
              <Icon name="more" size={18} color={c.ink3} />
            </View>
            <View style={[styles.tag, { backgroundColor: c.accentTint }]}>
              <Icon name="star" size={12} color={c.accent} />
              <Text style={[Type.label, { color: c.accent, letterSpacing: 0.4 }]}>{t('music.mustPlay')}</Text>
            </View>
            <View style={[styles.note, { backgroundColor: c.surface2 }]}>
              <View style={[styles.noteBar, { backgroundColor: c.red }]} />
              <Icon name="dj-note" size={16} color={c.accent} />
              <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]}>{t('music.sampleNote')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.steps}>
          {STEPS.map((step, i) => {
            const active = i === 1;
            return (
              <View key={step.n} style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: active ? c.red : c.line }} />
                <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: active ? c.red : c.ink3 }}>{step.n}</Text>
                <Text style={[Type.footnote, { color: active ? c.ink : c.ink3 }]}>{t(step.label)}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[Type.overline, { color: c.red }]}>{t('music.eyebrow')}</Text>
          <Text style={[Type.largeTitle, { color: c.ink }]}>
            {before}
            <Text style={[Type.accent, { color: c.accent }]}>{t('music.titleAccent')}</Text>
            {after}
          </Text>
          <Text style={[Type.body, { color: c.ink2 }]}>{t('music.body')}</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Button label={t('music.continue')} arrow="chev-r" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

function Record() {
  return (
    <View style={styles.record}>
      <View style={styles.groove} />
      <View style={styles.grooveInner} />
      <View style={styles.labelDisc}>
        <View style={styles.hole} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 22 },
  stage: { alignItems: 'center', marginTop: 8 },
  record: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groove: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  grooveInner: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  labelDisc: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a1a' },
  card: {
    marginTop: -28,
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    padding: 14,
    gap: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { fontFamily: Fonts.bold, fontSize: 18, width: 28 },
  art: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trackTitle: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 20 },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  note: { marginLeft: 38, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.md, padding: 10 },
  noteBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  steps: { flexDirection: 'row', gap: 10 },
});
