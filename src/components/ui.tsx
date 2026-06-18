import { useColorScheme, View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Brand, Radius, Space, type Scheme } from '@/lib/theme';

export function useC() {
  const scheme = (useColorScheme() ?? 'light') as Scheme;
  return Colors[scheme];
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
