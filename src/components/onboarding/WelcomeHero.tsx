import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { countdownModel } from '@/components/Countdown';
import { Logo } from '@/components/Logo';
import { ContentColumn } from '@/components/ui';
import { translate, type Locale } from '@/lib/i18n';
import { frameFor } from '@/lib/frame';
import { Brand, Fonts, Gradients, Type } from '@/lib/theme';
import { scaledType } from '@/lib/welcomeCopy';

/**
 * Full-bleed welcome poster. The day count uses `countdownModel`, the same
 * count as Home. The wedding-only moment line is not shown, so other
 * celebrations use the same poster. No cover means the brand gradient.
 */
export function WelcomeHero({
  hello,
  name,
  invite,
  date,
  dateLabel,
  venue,
  progress,
  coverUrl,
  locale,
  fontScale = 1,
  posterMinHeight = null,
}: {
  hello: string;
  name: string;
  invite: string;
  date: string | null;
  dateLabel?: string;
  venue?: string | null;
  progress?: number | null;
  coverUrl?: string | null;
  locale: Locale;
  fontScale?: number;
  /** Phone only. Null keeps the tablet poster. */
  posterMinHeight?: number | null;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tablet = frameFor(width).form === 'tablet';
  const compact = !tablet && height < 740;
  const model = date ? countdownModel(date, locale) : null;
  const showCount = model != null && model.tier !== 'dayOf' && model.tier !== 'married';
  const unit = model ? unitLabel(model.days, model.tier, locale) : '';
  const pct = progress == null ? null : Math.max(0, Math.min(100, Math.round(progress)));
  const kicker = scaledType(Type.overline, fontScale);
  const inviteType = scaledType({ fontSize: compact ? 16 : 17, lineHeight: compact ? 22 : 24 }, fontScale);
  const nameType = scaledType(
    { fontSize: tablet ? 56 : compact ? 34 : 42, lineHeight: tablet ? 60 : compact ? 38 : 46 },
    fontScale,
  );
  const numeral = scaledType(
    { fontSize: tablet ? 104 : compact ? 52 : 72, lineHeight: tablet ? 104 : compact ? 52 : 72 },
    fontScale,
  );
  const unitType = scaledType({ fontSize: compact ? 18 : 22, lineHeight: compact ? 22 : 28 }, fontScale);
  const meta = scaledType(Type.footnote, fontScale);
  const venueType = scaledType(
    { fontFamily: Fonts.displayItalic, fontSize: compact ? 18 : 20, lineHeight: compact ? 22 : 26, color: '#ffffff' },
    fontScale,
  );

  return (
    <View style={[styles.hero, posterMinHeight != null ? { height: posterMinHeight, minHeight: posterMinHeight } : null]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <LinearGradient
          colors={['#120c1e', '#2a1a52', Brand.purple]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.glow} pointerEvents="none" />
      <LinearGradient
        colors={coverUrl ? ['rgba(18,12,30,0.28)', 'rgba(18,12,30,0.12)', 'rgba(18,12,30,0.78)'] : ['rgba(18,12,30,0.05)', 'rgba(18,12,30,0)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ContentColumn fill={!tablet}>
        <View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + (tablet ? 32 : compact ? 8 : 10),
              paddingBottom: tablet ? 40 : compact ? 28 : 36,
              gap: tablet ? 12 : compact ? 6 : 10,
            },
            tablet ? styles.innerTablet : null,
          ]}>
          <Text style={[kicker, styles.kicker]}>{hello}</Text>
          {name ? <Text style={[styles.name, nameType]}>{name}</Text> : null}
          <Text style={[styles.invite, inviteType]}>{invite}</Text>
          <View style={tablet ? styles.logoTablet : [styles.spacer, compact ? styles.spacerCompact : null]}>
            <Logo variant="full" height={tablet ? 44 : compact ? 28 : 36} tone="#ffffff" />
          </View>
          {model ? (
            <View style={styles.countBlock}>
              {showCount ? <Text style={[styles.numeral, numeral]}>{model.days}</Text> : null}
              <Text style={[styles.unit, unitType]}>{unit}</Text>
              <View style={[styles.mark, compact ? styles.markCompact : null]} />
              {dateLabel ? <Text style={[styles.meta, meta]}>{dateLabel}</Text> : null}
              {venue ? <Text style={venueType}>{venue}</Text> : null}
              {pct != null ? (
                <View style={[styles.progressRow, compact ? styles.progressCompact : null]}>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={[styles.meta, meta]}>{translate(locale, 'cd.planned', { pct })}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ContentColumn>
    </View>
  );
}

function unitLabel(days: number, tier: string, locale: Locale) {
  if (tier === 'dayOf') return translate(locale, 'welcome.today');
  if (tier === 'married') return translate(locale, 'welcome.past');
  return translate(locale, days === 1 ? 'welcome.dayToGo' : 'welcome.daysToGo');
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', justifyContent: 'flex-end' },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Gradients.countdownHero.glow,
    opacity: 0.22,
    top: -80,
    right: -70,
  },
  inner: { flexGrow: 1, paddingHorizontal: 24, gap: 10 },
  innerTablet: { flexGrow: 0, gap: 12 },
  logoTablet: { marginTop: 10, marginBottom: 6, alignItems: 'flex-start' },
  kicker: { color: Gradients.countdownHero.glow },
  name: { fontFamily: Fonts.displayItalic, color: '#ffffff', marginTop: 2 },
  invite: { fontFamily: Fonts.body, color: 'rgba(255,255,255,0.88)', maxWidth: 460 },
  spacer: { flexGrow: 1, minHeight: 32, justifyContent: 'center', alignItems: 'flex-start' },
  spacerCompact: { minHeight: 28 },
  countBlock: { gap: 4, alignItems: 'flex-start' },
  numeral: { fontFamily: Fonts.display, color: '#ffffff', letterSpacing: -1.5 },
  unit: { fontFamily: Fonts.displayItalic, color: Gradients.countdownHero.glow, marginTop: -2 },
  mark: { width: 36, height: 3, borderRadius: 2, backgroundColor: Brand.red, marginTop: 10, marginBottom: 6 },
  markCompact: { marginTop: 6, marginBottom: 4 },
  meta: { fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.86)' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, width: 240 },
  progressCompact: { marginTop: 8 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: Brand.red },
});
