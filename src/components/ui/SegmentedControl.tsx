import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Shadow } from '@/lib/theme';
import { useC } from './useC';

/**
 * P2/Segmented — 42pt pill track.
 * Track: `sunken`. Selected thumb: `surface` + card shadow, ink bold.
 * Unselected: ink2 semibold. Pressed unselected thumb uses surface2.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useC();
  return (
    <View style={[styles.track, { backgroundColor: c.sunken }]} accessibilityRole="tablist">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.thumb,
              selected ? [{ backgroundColor: c.surface }, Shadow.card] : pressed ? { backgroundColor: c.surface2 } : null,
            ]}>
            <Text
              style={{
                color: selected ? c.ink : c.ink2,
                fontFamily: selected ? Fonts.bold : Fonts.semibold,
                fontSize: 14,
                lineHeight: 18,
              }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 42, borderRadius: Radius.pill, padding: 3, flexDirection: 'row' },
  thumb: { flex: 1, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
