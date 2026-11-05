import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { useC } from './useC';

/**
 * P2/Moment row — 70pt.
 * - default: time stack (H:MM + AM/PM) + title + meta + chevron, surface fill.
 * - no time (`time` null/empty): "Set time" in ink3 instead of the clock.
 * - dragging: card shadow + grip handle.
 * Timeline passes `showTime={false}` (the rail draws the clock), `handle` (always-on
 * drag icon), and `leading` (moment icon). Those props default off so the gallery row
 * stays the in-card clock + chevron.
 * Badges: `dj-note`, `done`, or a free string (e.g. "3/5").
 */
export function MomentRow({
  title,
  time,
  meta,
  metaIcon,
  badge,
  dragging = false,
  accentBorder = false,
  showTime = true,
  handle = false,
  chevron = true,
  leading,
  onPress,
  onLongPress,
  delayLongPress = 180,
}: {
  title: string;
  time?: string | null;
  meta?: string;
  metaIcon?: IconName;
  badge?: 'dj-note' | 'done' | string;
  dragging?: boolean;
  /** Dashed red frame while the row is the lifted drag card. */
  accentBorder?: boolean;
  showTime?: boolean;
  /** Always-visible drag handle. Long-press starts the drag. */
  handle?: boolean;
  chevron?: boolean;
  leading?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
}) {
  const c = useC();
  const clock = splitTime(time);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: accentBorder ? c.red : c.line },
        accentBorder ? styles.lifted : null,
        dragging ? [Shadow.card, styles.dragging] : null,
      ]}>
      {dragging && !handle ? <Icon name="grip" size={20} color={c.ink3} /> : null}
      {showTime ? (
        <View style={styles.time}>
          {clock ? (
            <>
              <Text style={[styles.hm, { color: c.ink }]}>{clock.main}</Text>
              {clock.suffix ? <Text style={[Type.label, { color: c.ink3, letterSpacing: 0.6 }]}>{clock.suffix}</Text> : null}
            </>
          ) : (
            <Text style={[Type.footnote, { color: c.ink3, textAlign: 'center' }]}>Set time</Text>
          )}
        </View>
      ) : null}
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <View style={styles.meta}>
            {metaIcon ? <Icon name={metaIcon} size={12} color={c.ink3} /> : null}
            <Text style={[Type.footnote, { color: c.ink2, flexShrink: 1 }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
      {badge ? <Badge badge={badge} /> : null}
      {handle ? (
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={delayLongPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Drag to reorder"
          style={[styles.handleHit, dragging && { backgroundColor: c.redTint }]}>
          <Icon name="drag" size={18} color={dragging ? c.red : c.ink3} />
        </Pressable>
      ) : null}
      {chevron ? <Icon name="chev-r" size={18} color={c.ink3} /> : null}
    </Pressable>
  );
}

function Badge({ badge }: { badge: string }) {
  const c = useC();
  if (badge === 'dj-note') {
    return (
      <View style={[styles.badge, { backgroundColor: c.accentTint }]}>
        <Icon name="dj-note" size={12} color={c.accent} />
        <Text style={[styles.badgeText, { color: c.accent }]}>DJ note</Text>
      </View>
    );
  }
  if (badge === 'done') {
    return (
      <View style={[styles.badge, { backgroundColor: c.accentTint }]}>
        <Icon name="check" size={12} color={c.success} />
        <Text style={[styles.badgeText, { color: c.success }]}>Done</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: c.surface2 }]}>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{badge}</Text>
    </View>
  );
}

function splitTime(time?: string | null): { main: string; suffix: string | null } | null {
  if (!time || !time.trim()) return null;
  const match = time.trim().match(/^(.*?)(?:\s*(AM|PM))$/i);
  if (match && match[2]) return { main: match[1].trim(), suffix: match[2].toUpperCase() };
  return { main: time.trim(), suffix: null };
}

const styles = StyleSheet.create({
  row: {
    minHeight: 70,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lifted: { borderWidth: 1.5, borderStyle: 'dashed' },
  dragging: { elevation: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  handleHit: { width: 28, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 14 },
  time: { width: 58, alignItems: 'center' },
  hm: { fontFamily: Fonts.display, fontSize: 18, lineHeight: 22 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
