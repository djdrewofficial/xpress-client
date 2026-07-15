import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand } from '@/lib/theme';

/* Animated brand splash — the [X] mark glows in: the brackets settle first, then
   the brush-stroke X fades up out of a soft bloom of light. Transforms + opacity
   only, so it runs on the native driver and renders before fonts load. `label`
   is kept for stuck-stage diagnosis (faint caption). */

const STROKE_BACK = require('../assets/x-stroke-back.png'); // "\"
const STROKE_FRONT = require('../assets/x-stroke-front.png'); // "/"
const IMG_RATIO = 622 / 842; // w / h of the split crops

const BOX = 280;
const MARK_H = 208;
const MARK_W = Math.round(MARK_H * IMG_RATIO);
const STROKE = '#ffffff';

export function BrandSplash({ label }: { label?: string }) {
  const bracket = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current; // the X: fade + gentle scale
  const glow = useRef(new Animated.Value(0)).current; // light bloom behind it
  const caption = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.timing(bracket, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(x, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    intro.start();

    const tag = Animated.timing(caption, { toValue: 1, duration: 460, delay: 780, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    tag.start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1700, delay: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => {
      intro.stop();
      tag.stop();
      loop.stop();
    };
  }, [bracket, x, glow, caption, breathe]);

  const idleScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const xStyle = {
    opacity: x,
    transform: [{ scale: x.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
  };

  const bracketStyle = (side: 'left' | 'right') => ({
    opacity: bracket,
    transform: [
      { translateX: bracket.interpolate({ inputRange: [0, 1], outputRange: [side === 'left' ? -18 : 18, 0] }) },
      { scale: bracket.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  });

  return (
    <LinearGradient colors={['#5a3ea6', Brand.purple, '#241748']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
      <Animated.View style={[styles.mark, { transform: [{ scale: idleScale }] }]}>
        {/* soft bloom of light the X glows out of */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glow.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.7, 0.18] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.35] }) }],
            },
          ]}
        />

        {/* [ ] brackets */}
        <Animated.View style={[styles.bracket, styles.bracketLeft, bracketStyle('left')]} />
        <Animated.View style={[styles.bracket, styles.bracketRight, bracketStyle('right')]} />

        {/* the brush-stroke X (both strokes overlaid → the full mark) */}
        <Animated.View style={[styles.strokeWrap, xStyle]}>
          <Image source={STROKE_BACK} style={styles.strokeImg} resizeMode="contain" tintColor={STROKE} />
          <Image source={STROKE_FRONT} style={[styles.strokeImg, StyleSheet.absoluteFill]} resizeMode="contain" tintColor={STROKE} />
        </Animated.View>
      </Animated.View>

      <Animated.Text
        style={[styles.tagline, { opacity: caption, transform: [{ translateY: caption.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
      >
        The Ultimate Wedding Experience
      </Animated.Text>

      {label ? <Text style={styles.debug}>{label}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: BOX, height: BOX, alignItems: 'center', justifyContent: 'center' },

  glow: {
    position: 'absolute',
    top: BOX / 2 - 80,
    left: BOX / 2 - 80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Brand.purpleLighter,
    shadowColor: Brand.purpleLighter,
    shadowOpacity: 1,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 0 },
  },

  bracket: {
    position: 'absolute',
    top: BOX / 2 - 78,
    width: 34,
    height: 156,
    borderColor: STROKE,
    borderTopWidth: 6,
    borderBottomWidth: 6,
  },
  bracketLeft: { left: 14, borderLeftWidth: 6, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  bracketRight: { right: 14, borderRightWidth: 6, borderTopRightRadius: 4, borderBottomRightRadius: 4 },

  strokeWrap: { position: 'absolute', top: BOX / 2 - MARK_H / 2, left: BOX / 2 - MARK_W / 2, width: MARK_W, height: MARK_H },
  strokeImg: { width: '100%', height: '100%' },

  tagline: { position: 'absolute', bottom: '20%', color: 'rgba(255,255,255,0.82)', fontSize: 15, letterSpacing: 0.3, fontWeight: '600' },
  debug: { position: 'absolute', bottom: 26, color: 'rgba(255,255,255,0.35)', fontSize: 11 },
});
