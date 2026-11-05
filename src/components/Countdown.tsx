import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Brand, Fonts, Radius, Space } from '@/lib/theme';

/* A living wedding countdown for the Plan hero. Rather than a flat "247 days
   left," it names a specific future moment to savor and shifts TONE as the day
   nears — dream big when it's far off, magical urgency in the final week, a
   celebratory state day-of. Designed for the dark hero (white text on imagery). */

// Future moments worth anticipating — rotated by the day count so the framing
// feels alive day to day yet stays stable within a single render.
const MOMENTS = [
  'your first dance as newlyweds',
  'you say “I do”',
  'your first kiss as newlyweds',
  'you walk down the aisle',
  'your grand entrance',
  'the party of your lives',
] as const;

export type CountdownTier = 'married' | 'dayOf' | 'finalWeek' | 'mid' | 'far';

export type CountdownModel = {
  days: number;
  tier: CountdownTier;
  toneLabel: string;
  toneColor: string;
  moment: string;
  /** Sentence beside the numeral. No emoji. */
  line: string;
};

function tierFor(days: number): CountdownTier {
  if (days < 0) return 'married';
  if (days === 0) return 'dayOf';
  if (days <= 7) return 'finalWeek';
  if (days <= 90) return 'mid';
  return 'far';
}

const TONE: Record<CountdownTier, { label: string; accent: string }> = {
  far: { label: 'DREAM BIG — THERE’S NO RUSH', accent: Brand.purpleLighter },
  mid: { label: 'LET’S SHAPE THE NIGHT', accent: Brand.purpleLighter },
  finalWeek: { label: 'THE FINAL MAGICAL TOUCHES', accent: Brand.redLight },
  dayOf: { label: 'TODAY IS THE DAY', accent: Brand.redLight },
  married: { label: 'HERE’S TO FOREVER', accent: Brand.redLight },
};

/** Whole days from local midnight today to the event date (negative = past). */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Shared by the Plan hero (`Countdown`) and the v2 `CountdownHero`. */
export function countdownModel(date: string): CountdownModel {
  const days = daysUntil(date);
  const tier = tierFor(days);
  const tone = TONE[tier];
  const moment = MOMENTS[Math.abs(days) % MOMENTS.length];
  const line =
    tier === 'dayOf' ? `Today, ${moment}`
    : tier === 'married' ? 'Congratulations, newlyweds'
    : `${days === 1 ? 'day' : 'days'} until ${moment}`;
  return { days, tier, toneLabel: tone.label, toneColor: tone.accent, moment, line };
}

export function Countdown({ date }: { date: string }) {
  const model = countdownModel(date);
  const leadSmall = model.tier === 'dayOf' || model.tier === 'married';

  return (
    <View style={styles.banner}>
      {model.tier === 'dayOf' ? (
        <Icon name="sparkles" size={34} color={model.toneColor} />
      ) : model.tier === 'married' ? (
        <Icon name="rings" size={34} color={model.toneColor} />
      ) : (
        <Text style={[styles.lead, leadSmall && styles.leadSmall, { color: model.toneColor }]}>{model.days}</Text>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.line}>{model.line}</Text>
        <Text style={[styles.tone, { color: model.toneColor }]}>{model.toneLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: Space.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  lead: { fontFamily: Fonts.display, fontSize: 46, lineHeight: 50, letterSpacing: -1 },
  leadSmall: { fontSize: 34, lineHeight: 46 },
  line: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  tone: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 3 },
});
