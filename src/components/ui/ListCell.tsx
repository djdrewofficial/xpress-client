import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Shadow, Type } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { useC } from './useC';

/**
 * P2/List cell — 62pt, radius 20.
 * Leading icon in an accent-tint circle, title + optional subtitle, trailing chevron
 * (or a custom `trailing` node). Pressed: surface2. Used for My Event, settings, and menu rows.
 */
export function ListCell({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        Shadow.card,
        { backgroundColor: pressed ? c.surface2 : c.surface },
      ]}>
      {icon ? (
        <View style={[styles.bubble, { backgroundColor: c.accentTint }]}>
          <Icon name={icon} size={20} color={c.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <Icon name="chev-r" size={18} color={c.ink3} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    minHeight: 62,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
});
