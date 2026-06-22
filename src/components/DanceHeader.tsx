import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';

import { useScheme } from '@/components/ui';
import { Radius } from '@/lib/theme';

/* Looping disco-ball banner for the Dancing section. Layers, bottom → top:
   the wallpaper gradient (shown until the first frame loads, and as the fallback
   if the video can't play), the muted looping video, then the same film-grain
   texture used on the app wallpaper so the header reads as part of the brand. */
export function DanceHeader({ height = 200 }: { height?: number }) {
  const dark = useScheme() === 'dark';
  const { width } = useWindowDimensions();
  const colors = dark
    ? (['#241640', '#160f2b', '#0a0712'] as const)
    : (['#f7f4fd', '#efe9fb', '#f6f3fc'] as const);

  const player = useVideoPlayer(require('../assets/discoball.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <Image
        source={require('../assets/noise.png')}
        resizeMode="repeat"
        style={{ position: 'absolute', top: 0, left: 0, width, height, opacity: dark ? 0.5 : 0.4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, overflow: 'hidden' },
});
