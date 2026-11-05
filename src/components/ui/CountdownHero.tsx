import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { countdownModel } from '@/components/Countdown';
import { Fonts, Gradients, Radius, Type } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * Countdown hero built on `countdownModel` from `Countdown.tsx` (same day-count,
 * tier, and moment copy — not a second countdown).
 *
 * - `compact` — Home overlay, ~127pt, numeral + living line on the hero surface.
 * - `large` — Onboarding welcome card: eyebrow, display numeral, "days to go", optional progress.
 *
 * States follow the tier from the shared model: far / mid / final week / day-of / married.
 * `locale` switches the unit and progress line (en / es) for the welcome screen.
 */
export function CountdownHero({
  date,
  venue,
  dateLabel,
  progress,
  size = 'compact',
  locale = 'en',
}: {
  date: string;
  venue?: string | null;
  /** Preformatted eyebrow date, e.g. "SAT · JUNE 13, 2027". */
  dateLabel?: string;
  /** 0–100. Shown as "43% planned" / "43% planeado" when set. */
  progress?: number;
  size?: 'compact' | 'large';
  locale?: 'en' | 'es';
}) {
  const model = countdownModel(date);
  const showCount = model.tier !== 'dayOf' && model.tier !== 'married';
  const eyebrow = [dateLabel ?? formatDate(date), venue].filter(Boolean).join('  ·  ');
  const unit = unitLabel(model.days, model.tier, locale, size);
  const progressLabel =
    progress == null ? null : locale === 'es' ? `${Math.round(progress)}% planeado` : `${Math.round(progress)}% planned`;

  return (
    <View style={[styles.card, size === 'large' ? styles.large : styles.compact]}>
      <LinearGradient
        colors={[Gradients.countdownHero.night, Gradients.countdownHero.hero, '#4b328e']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} pointerEvents="none" />

      <Text style={[Type.overline, styles.eyebrow]} numberOfLines={1}>
        {eyebrow}
      </Text>

      {size === 'large' ? (
        <View style={styles.largeBody}>
          {showCount ? (
            <Text style={styles.display}>{model.days}</Text>
          ) : model.tier === 'dayOf' ? (
            <Icon name="sparkles" size={56} color={Gradients.countdownHero.glow} />
          ) : (
            <Icon name="rings" size={56} color={Gradients.countdownHero.glow} />
          )}
          <Text style={[Type.callout, styles.unit]}>{unit}</Text>
          <Text style={[Type.footnote, styles.moment]}>{model.line}</Text>
          {progressLabel ? <Text style={[Type.subhead, styles.progress]}>{progressLabel}</Text> : null}
        </View>
      ) : (
        <View style={styles.compactRow}>
          {showCount ? (
            <Text style={styles.compactNum}>{model.days}</Text>
          ) : (
            <Icon name={model.tier === 'dayOf' ? 'sparkles' : 'rings'} size={36} color={Gradients.countdownHero.glow} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[Type.callout, styles.unit, { textAlign: 'left' }]}>{model.line}</Text>
            <Text style={[Type.label, { color: model.toneColor, marginTop: 4 }]}>{model.toneLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00')
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function unitLabel(days: number, tier: string, locale: 'en' | 'es', size: 'compact' | 'large') {
  if (tier === 'dayOf') return locale === 'es' ? 'hoy es el día' : 'today is the day';
  if (tier === 'married') return locale === 'es' ? 'recién casados' : 'just married';
  if (size === 'compact') return locale === 'es' ? (days === 1 ? 'día' : 'días') : days === 1 ? 'day to go' : 'days to go';
  if (locale === 'es') return days === 1 ? 'día' : 'días';
  return days === 1 ? 'day to go' : 'days to go';
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden', padding: 16 },
  compact: { minHeight: 127, justifyContent: 'center' },
  large: { minHeight: 200, alignItems: 'center' },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Gradients.countdownHero.glow,
    opacity: 0.28,
    top: -50,
    right: -30,
  },
  eyebrow: { color: Gradients.countdownHero.glow },
  largeBody: { alignItems: 'center', marginTop: 8 },
  display: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -0.64, color: '#ffffff' },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  compactNum: { fontFamily: Fonts.display, fontSize: 48, lineHeight: 52, letterSpacing: -0.5, color: '#ffffff' },
  unit: { color: '#ffffff', textAlign: 'center', marginTop: 2 },
  moment: { color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginTop: 4 },
  progress: { color: Gradients.countdownHero.glow, marginTop: 8 },
});
