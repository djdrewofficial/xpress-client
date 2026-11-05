import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { countdownModel } from '@/components/Countdown';
import { translate, type Locale } from '@/lib/i18n';
import { Fonts, Gradients, Radius, Type } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * Countdown hero built on `countdownModel` from `Countdown.tsx` (same day-count,
 * tier, and moment copy — not a second countdown).
 *
 * - `compact` — Home overlay: numeral, "days to go", living line, and (when
 *   `progress` is set) the plan bar. `bare` drops the card fill so it can sit
 *   on the couple's photo.
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
  showMoment = true,
  bare = false,
}: {
  date: string;
  venue?: string | null;
  /** Preformatted eyebrow date, e.g. "SAT · JUNE 13, 2027". */
  dateLabel?: string;
  /** 0–100. Shown as "43% planned" / "43% planeado" when set. */
  progress?: number;
  size?: 'compact' | 'large';
  locale?: Locale;
  /**
   * Living moment sentence under the unit. Welcome passes false: that line is
   * English-only, and the welcome artboard doesn't show it.
   */
  showMoment?: boolean;
  /** No card fill — text sits directly on a photo or gradient. */
  bare?: boolean;
}) {
  const model = countdownModel(date, locale);
  const showCount = model.tier !== 'dayOf' && model.tier !== 'married';
  const eyebrow = [dateLabel ?? formatDate(date, locale), venue].filter(Boolean).join('  ·  ');
  const unit = unitLabel(model.days, model.tier, locale);
  const progressLabel = progress == null ? null : translate(locale, 'cd.planned', { pct: Math.round(progress) });
  const pct = progress == null ? 0 : Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.card, size === 'large' ? styles.large : styles.compact, bare && styles.bare]}>
      {bare ? null : (
        <>
          <LinearGradient
            colors={[Gradients.countdownHero.night, Gradients.countdownHero.hero, '#4b328e']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glow} pointerEvents="none" />
        </>
      )}

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
          {showMoment ? <Text style={[Type.footnote, styles.moment]}>{model.line}</Text> : null}
          {progressLabel ? <Text style={[Type.subhead, styles.progress]}>{progressLabel}</Text> : null}
        </View>
      ) : (
        <View style={{ marginTop: 6, gap: 10 }}>
          <View style={styles.compactRow}>
            {showCount ? (
              <Text style={styles.compactNum}>{model.days}</Text>
            ) : (
              <Icon name={model.tier === 'dayOf' ? 'sparkles' : 'rings'} size={40} color={Gradients.countdownHero.glow} />
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.daysToGo}>{unit}</Text>
              <Text style={[Type.footnote, styles.moment, { textAlign: 'left' }]} numberOfLines={2}>
                {model.line}
              </Text>
            </View>
          </View>
          {progressLabel ? (
            <View style={styles.progressRow}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={[Type.footnote, styles.progressSide]}>{progressLabel}</Text>
            </View>
          ) : (
            <Text style={[Type.label, { color: model.toneColor }]}>{model.toneLabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function formatDate(date: string, locale: Locale) {
  return new Date(date + 'T00:00:00')
    .toLocaleDateString(locale === 'es' ? 'es-419' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function unitLabel(days: number, tier: string, locale: Locale) {
  if (tier === 'dayOf') return translate(locale, 'cd.todayShort');
  if (tier === 'married') return translate(locale, 'cd.justMarried');
  if (locale === 'es') return translate(locale, days === 1 ? 'cd.day' : 'cd.days');
  return translate(locale, days === 1 ? 'cd.dayToGo' : 'cd.daysToGo');
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden', padding: 16 },
  compact: { minHeight: 127, justifyContent: 'center' },
  large: { minHeight: 200, alignItems: 'center' },
  bare: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, minHeight: 0, borderRadius: 0 },
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
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  compactNum: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -1, color: '#ffffff' },
  daysToGo: { fontFamily: Fonts.displayItalic, fontSize: 22, lineHeight: 26, color: Gradients.countdownHero.glow },
  unit: { color: '#ffffff', textAlign: 'center', marginTop: 2 },
  moment: { color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginTop: 4 },
  progress: { color: Gradients.countdownHero.glow, marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: '#fe3a3b' },
  progressSide: { color: 'rgba(255,255,255,0.92)' },
});
