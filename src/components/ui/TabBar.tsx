import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frameFor } from '@/lib/frame';
import { useT } from '@/lib/i18n';
import { Type } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { useC } from './useC';

export type TabItem = { key: string; label: string; icon: IconName };

/** Approved v2 order. The live tab navigator still uses the current route order until the screen phase. */
export const V2_TABS: readonly TabItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'timeline', label: 'Timeline', icon: 'timeline' },
  { key: 'music', label: 'Music', icon: 'music' },
  { key: 'my-event', label: 'My Event', icon: 'rings' },
];

/**
 * P2/Tab bar. Selected icon + label use `accent` (lavender in dark). Unselected: `ink3`.
 * Surface fill, top hairline. Height includes the home-indicator inset.
 *
 * Presentational — expo-router still owns the real tab navigator. Later phases can
 * render this (or match these tokens on `Tabs`) when Home / Timeline / Music / My Event land.
 */
export function TabBar({
  tabs = V2_TABS,
  active,
  onChange,
}: {
  tabs?: readonly TabItem[];
  active: string;
  onChange?: (key: string) => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const frame = frameFor(width);
  const bottom = Math.max(insets.bottom, 12);
  const labels = {
    home: t('tab.home'),
    timeline: t('tab.timeline'),
    music: t('tab.music'),
    'my-event': t('tab.my-event'),
  } as const;
  const items = tabs.map((tab) => {
    const label = labels[tab.key as keyof typeof labels];
    return label ? { ...tab, label } : tab;
  });
  return (
    <View
      style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: bottom }]}
      accessibilityRole="tablist">
      <View style={[styles.row, frame.form === 'tablet' ? { width: frame.contentWidth, alignSelf: 'center' } : null]}>
      {items.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? c.accent : c.ink3;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange?.(tab.key)}
            style={styles.tab}>
            <Icon name={tab.icon} size={24} color={color} />
            <Text style={[Type.tab, { color, marginTop: 4 }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  row: { flexDirection: 'row', width: '100%' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 49 },
});
