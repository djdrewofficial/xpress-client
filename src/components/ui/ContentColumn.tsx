import type { ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { frameFor } from '@/lib/frame';

/** Centers primary content on a tablet. On a phone it does not add a column. */
export function ContentColumn({
  children,
  fill = false,
  style,
}: {
  children: ReactNode;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const frame = frameFor(width);
  const fillStyle = fill ? { flex: 1 as const } : null;
  if (frame.form === 'phone') {
    return <View style={[fillStyle, style]}>{children}</View>;
  }
  return (
    <View style={[{ width: '100%', alignItems: 'center' }, fillStyle, style]}>
      <View style={[{ width: frame.contentWidth, maxWidth: '100%' }, fillStyle]}>{children}</View>
    </View>
  );
}
