import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Shadow, Type } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { useC } from './useC';

/**
 * P2/Button — 54pt pill.
 *
 * Variants:
 * - `primary` — red fill, on-red label, soft lift. Pressed: 0.92 opacity. Disabled: 0.4, non-interactive.
 * - `secondary` — accent-tint fill, accent label (quiet filled action). Pressed: 0.92. Disabled: 0.4.
 * - `ghost` — transparent, 1.5px `line` stroke, ink label. Pressed: `surface2` fill. Disabled: 0.4.
 *
 * `arrow` pins an 18px `arrow-ur` (or `chev-r`) 16px from the right edge. The label stays centered.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  arrow = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  arrow?: boolean | 'arrow-ur' | 'chev-r';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useC();
  const arrowName: IconName | null = arrow === true ? 'arrow-ur' : arrow || null;
  const fill = variant === 'primary' ? c.red : variant === 'secondary' ? c.accentTint : 'transparent';
  const labelColor = variant === 'primary' ? c.onRed : variant === 'secondary' ? c.accent : c.ink;
  const borderColor = variant === 'ghost' ? c.line : 'transparent';
  const borderWidth = variant === 'ghost' ? 1.5 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed && variant === 'ghost' ? c.surface2 : fill,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.4 : pressed ? 0.92 : 1,
        },
        variant === 'primary' && !disabled ? Shadow.button : null,
        style,
      ]}>
      <Text style={[Type.button, { color: labelColor }]}>{label}</Text>
      {arrowName ? (
        <View style={styles.arrow} pointerEvents="none">
          <Icon name={arrowName} size={18} color={labelColor} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  arrow: { position: 'absolute', right: 16 },
});
