import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, Type } from '@/lib/theme';
import { Icon } from './Icon';
import { useC } from './useC';

/**
 * P2/Nav bar (44pt) and the large serif title used under it.
 *
 * Inline: leading `chev-l` (when `onBack` is set), Montserrat Bold 17 title, optional
 * trailing text action in accent or red.
 * Large: the same bar, then a 34pt DM Serif title. `accent` is the substring drawn
 * in DM Serif Display Italic (Proposal v2/Accent) — e.g. title "The Ultimate night", accent "Ultimate".
 */
export function NavBar({
  title,
  accent,
  large = false,
  onBack,
  trailing,
}: {
  title: string;
  accent?: string;
  large?: boolean;
  onBack?: () => void;
  trailing?: { label: string; onPress: () => void; tone?: 'accent' | 'red' };
}) {
  const c = useC();
  const trailColor = trailing?.tone === 'red' ? c.red : c.accent;

  const bar = (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chev-l" size={24} color={c.ink} />
          </Pressable>
        ) : null}
      </View>
      {large ? <View style={{ flex: 1 }} /> : <AccentTitle title={title} accent={undefined} color={c.ink} large={false} />}
      <View style={[styles.side, styles.trail]}>
        {trailing ? (
          <Pressable onPress={trailing.onPress} hitSlop={8} accessibilityRole="button">
            <Text style={[Type.button, { color: trailColor }]}>{trailing.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (!large) return <View style={{ backgroundColor: c.bg }}>{bar}</View>;

  return (
    <View style={{ backgroundColor: c.bg, paddingBottom: 8 }}>
      {bar}
      <View style={styles.largeWrap}>
        <AccentTitle title={title} accent={accent} color={c.ink} large />
      </View>
    </View>
  );
}

function AccentTitle({ title, accent, color, large }: { title: string; accent?: string; color: string; large: boolean }) {
  const base = large ? Type.largeTitle : Type.headline;
  if (!large || !accent) {
    return (
      <Text style={[base, styles.inlineTitle, { color }]} numberOfLines={large ? 3 : 1}>
        {title}
      </Text>
    );
  }
  const at = title.indexOf(accent);
  if (at < 0) {
    return (
      <Text style={[base, { color }]} numberOfLines={3}>
        {title}
      </Text>
    );
  }
  return (
    <Text style={[base, { color }]} numberOfLines={3}>
      {title.slice(0, at)}
      <Text style={Type.accent}>{accent}</Text>
      {title.slice(at + accent.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Screen.navBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: { width: 72, justifyContent: 'center' },
  trail: { alignItems: 'flex-end' },
  inlineTitle: { flex: 1, textAlign: 'center' },
  largeWrap: { paddingHorizontal: 20, paddingTop: 4 },
});
