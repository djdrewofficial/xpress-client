import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { Icon } from './Icon';
import { useC } from './useC';

/**
 * P2/Moment row — 70pt.
 * - default: time stack (H:MM + AM/PM) + title + meta + chevron, surface fill.
 * - no time (`time` null/empty): "Set time" in ink3 instead of the clock.
 * - dragging: card shadow + grip handle.
 * Badges: `dj-note`, `done`, or a free string (e.g. "3/5").
 */
export function MomentRow({
  title,
  time,
  meta,
  badge,
  dragging = false,
  onPress,
}: {
  title: string;
  time?: string | null;
  meta?: string;
  badge?: 'dj-note' | 'done' | string;
  dragging?: boolean;
  onPress?: () => void;
}) {
  const c = useC();
  const clock = splitTime(time);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line },
        dragging ? Shadow.card : null,
      ]}>
      {dragging ? <Icon name="grip" size={20} color={c.ink3} /> : null}
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
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {badge ? <Badge badge={badge} /> : null}
      <Icon name="chev-r" size={18} color={c.ink3} />
    </Pressable>
  );
}

function Badge({ badge }: { badge: string }) {
  const c = useC();
  if (badge === 'dj-note') {
    return (
      <View style={[styles.badge, { backgroundColor: c.accentTint }]}>
        <Icon name="dj-note" size={12} color={c.accent} />
        <Text style={[Type.label, { color: c.accent, letterSpacing: 0.4 }]}>DJ note</Text>
      </View>
    );
  }
  if (badge === 'done') {
    return (
      <View style={[styles.badge, { backgroundColor: c.accentTint }]}>
        <Icon name="check" size={12} color={c.success} />
        <Text style={[Type.label, { color: c.success, letterSpacing: 0.4 }]}>Done</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  time: { width: 58, alignItems: 'center' },
  hm: { fontFamily: Fonts.display, fontSize: 18, lineHeight: 22 },
  title: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
