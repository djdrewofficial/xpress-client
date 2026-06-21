import { useColorScheme, View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { Colors, Brand, Radius, Space, type Scheme } from '@/lib/theme';

export function useC() {
  const scheme = (useColorScheme() ?? 'light') as Scheme;
  return Colors[scheme];
}

export function useScheme(): Scheme {
  return (useColorScheme() ?? 'light') as Scheme;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useC();
  return (
    <View style={[{ backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: Space.lg }, style]}>
      {children}
    </View>
  );
}

/** Slim progress bar. */
export function Bar({ pct, height = 8, track }: { pct: number; height?: number; track?: string }) {
  const c = useC();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.cardAlt, overflow: 'hidden' }}>
      <LinearGradient
        colors={[Brand.purple, Brand.purpleLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: height }}
      />
    </View>
  );
}

/**
 * Circular progress ring with the percentage centered.
 * `color` drives the arc; the track is a faint version of it.
 */
export function Ring({
  pct,
  size = 56,
  stroke = 6,
  color = Brand.purple,
  track,
  label,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamped / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? color + '26'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </Svg>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.27 }}>{label ?? `${Math.round(clamped)}%`}</Text>
    </View>
  );
}

/** Little gradient "AI" pill used to flag smart features. */
export function Sparkle({ label = 'For You', style }: { label?: string; style?: ViewStyle }) {
  return (
    <LinearGradient
      colors={[Brand.purple, Brand.purpleLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: 11 }}>✨</Text>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.3 }}>{label}</Text>
    </LinearGradient>
  );
}

export function GradientButton({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed || disabled ? 0.85 : 1 }, style]}>
      <LinearGradient colors={[Brand.purple, Brand.purpleLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
        <Text style={s.btnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: Radius.md, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
