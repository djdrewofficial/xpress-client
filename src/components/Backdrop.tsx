import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useScheme } from '@/components/ui';

/* Branded app background: a deep purple gradient with a fine film-grain texture
   tiled over it. Drop as the first child of a screen's (transparent) root. */
export function Backdrop() {
  const dark = useScheme() === 'dark';
  const colors = dark
    ? (['#241640', '#160f2b', '#0a0712'] as const)
    : (['#f7f4fd', '#efe9fb', '#f6f3fc'] as const);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={require('../assets/noise.png')}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity: dark ? 0.7 : 0.5 }]}
      />
    </View>
  );
}
