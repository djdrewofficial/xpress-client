import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useScheme } from '@/components/ui';

/* Branded app background: a deep purple gradient with a fine film-grain texture
   tiled over it. Drop as the first child of a screen's (transparent) root.
   The grain Image gets an explicit full-window size — RN's resizeMode="repeat"
   only tiles when the frame has concrete width/height (absoluteFill alone renders
   a single tile). */
export function Backdrop() {
  const dark = useScheme() === 'dark';
  const { width, height } = useWindowDimensions();
  const colors = dark
    ? (['#241640', '#160f2b', '#0a0712'] as const)
    : (['#f7f4fd', '#efe9fb', '#f6f3fc'] as const);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={require('../assets/noise.png')}
        resizeMode="repeat"
        style={{ position: 'absolute', top: 0, left: 0, width, height, opacity: dark ? 0.5 : 0.4 }}
      />
    </View>
  );
}
