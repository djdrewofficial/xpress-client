import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/* Soft white blobs of light that drift slowly behind the login form to give the
   page a subtle sense of life. Pure transform loops (native driver); the layer
   is non-interactive so it never blocks the form. */

type Blob = { size: number; top: string; left: string; opacity: number; dx: number; dy: number; dur: number };

const BLOBS: Blob[] = [
  { size: 300, top: '4%', left: '-14%', opacity: 0.1, dx: 34, dy: 26, dur: 11000 },
  { size: 240, top: '46%', left: '58%', opacity: 0.09, dx: -30, dy: -34, dur: 13500 },
  { size: 200, top: '72%', left: '4%', opacity: 0.08, dx: 26, dy: -22, dur: 9500 },
];

function DriftingBlob({ size, top, left, opacity, dx, dy, dur }: Blob) {
  // two independent oscillators (different periods) → an organic wandering path
  const vx = useRef(new Animated.Value(0)).current;
  const vy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const osc = (v: Animated.Value, d: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const ax = osc(vx, dur);
    const ay = osc(vy, Math.round(dur * 1.37));
    ax.start();
    ay.start();
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [vx, vy, dur]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: top as any,
        left: left as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ffffff',
        opacity,
        shadowColor: '#ffffff',
        shadowOpacity: 0.9,
        shadowRadius: 60,
        shadowOffset: { width: 0, height: 0 },
        transform: [
          { translateX: vx.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
          { translateY: vy.interpolate({ inputRange: [0, 1], outputRange: [-dy, dy] }) },
        ],
      }}
    />
  );
}

export function MovingBlobs() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BLOBS.map((b, i) => (
        <DriftingBlob key={i} {...b} />
      ))}
    </View>
  );
}
