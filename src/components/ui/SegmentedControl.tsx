import { Pressable, StyleSheet, Text, View } from 'react-native';

import { segmentedControlColors, SEGMENTED_MIN_HEIGHT } from '@/lib/segmentedControl';
import { Fonts, Radius } from '@/lib/theme';
import { useScheme } from './useC';

/**
 * Segmented tabs used on moment screens (Questions / Songs / Notes), song picker,
 * and staff event lists. Selected thumb uses brand purple (lighter in dark mode)
 * with a thin red accent so the control stays obvious in both schemes.
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
  const scheme = useScheme();
  const tone = segmentedControlColors(scheme);
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: tone.trackBackground,
          borderColor: tone.trackBorder,
        },
      ]}
      accessibilityRole="tablist">
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
              selected
                ? { backgroundColor: tone.selectedBackground }
                : pressed
                  ? { backgroundColor: tone.pressedBackground }
                  : null,
            ]}>
            <Text
              style={{
                color: selected ? tone.selectedLabel : tone.unselectedLabel,
                fontFamily: selected ? Fonts.bold : Fonts.semibold,
                fontSize: 14,
                lineHeight: 18,
                textAlign: 'center',
              }}
              numberOfLines={1}>
              {opt.label}
            </Text>
            {selected ? (
              <View style={[styles.accent, { backgroundColor: tone.selectedAccent }]} />
            ) : (
              <View style={styles.accentSpacer} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: SEGMENTED_MIN_HEIGHT,
    borderRadius: Radius.md,
    padding: 4,
    flexDirection: 'row',
    borderWidth: 1.5,
    gap: 4,
  },
  thumb: {
    flex: 1,
    minHeight: SEGMENTED_MIN_HEIGHT - 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 4,
  },
  accent: {
    height: 3,
    width: 22,
    borderRadius: 2,
  },
  accentSpacer: {
    height: 3,
    width: 22,
  },
});
