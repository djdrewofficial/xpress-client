import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ICON_XML, type IconName } from './iconData';

const STROKE = /stroke="#[0-9A-Fa-f]{3,8}"/g;

/**
 * Proposal v2 icon. 24×24 viewBox, stroke 1.75, round caps.
 * Pass `color` (defaults to light ink `#120C1E`). Size scales the viewBox; stroke stays 1.75 in that space.
 */
export function Icon({
  name,
  size = 24,
  color = '#120C1E',
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const xml = ICON_XML[name].replace(STROKE, `stroke="${color}"`);
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

/**
 * Play uses the icon set. The v2 set has no pause glyph, so pause is two bars
 * drawn to the same size — never an emoji.
 */
export function PlayPauseIcon({ playing, size = 16, color = '#ffffff' }: { playing: boolean; size?: number; color?: string }) {
  if (!playing) return <Icon name="play" size={size} color={color} />;
  const bar = Math.max(2, Math.round(size * 0.18));
  const gap = Math.max(2, Math.round(size * 0.16));
  const h = Math.round(size * 0.72);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap }}>
      <View style={{ width: bar, height: h, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: bar, height: h, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

export type { IconName };
