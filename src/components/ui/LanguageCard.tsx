import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Type } from '@/lib/theme';
import { useC } from './useC';

/**
 * Welcome language card. Two sit side by side; the parent lays them out.
 * Selected: accent border, accent-tint fill, "Selected" / "Elegido" chip.
 * Unselected: surface fill, line stroke, no chip.
 * Tap applies immediately — there is no save step.
 */
export function LanguageCard({
  label,
  selected,
  selectedLabel = 'Selected',
  onPress,
  compact = false,
}: {
  label: string;
  selected: boolean;
  selectedLabel?: string;
  onPress: () => void;
  /** Shorter row for Welcome. The default card is unchanged. */
  compact?: boolean;
}) {
  const c = useC();
  const chip = selected ? (
    <View style={[styles.chip, { backgroundColor: c.accent }]}>
      <Text style={[Type.label, { color: c.onAccent, letterSpacing: 0.6 }]}>{selectedLabel}</Text>
    </View>
  ) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        compact ? styles.compact : styles.card,
        {
          backgroundColor: selected ? c.accentTint : pressed ? c.surface2 : c.surface,
          borderColor: selected ? c.accent : c.line,
        },
      ]}>
      {compact ? (
        <>
          <Text style={[styles.compactLabel, { color: c.ink }]} numberOfLines={1}>{label}</Text>
          {chip}
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
          <View style={styles.chipSlot}>{chip}</View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 92,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: 'space-between',
  },
  label: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
  chipSlot: { minHeight: 22, marginTop: 10 },
  chip: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  compact: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactLabel: { flexShrink: 1, fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
});
