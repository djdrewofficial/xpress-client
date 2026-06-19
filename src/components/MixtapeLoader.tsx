import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useC } from '@/components/ui';
import { Brand, Space } from '@/lib/theme';

/* A spinning 2000s CD with rotating, slightly-cheeky status lines — shown while
   the For You picks are being put together (it can take a moment). */
export function MixtapeLoader({ eventName }: { eventName?: string }) {
  const c = useC();
  const spin = useRef(new Animated.Value(0)).current;
  const [i, setI] = useState(0);

  const messages = [
    `Burning the ${eventName?.trim() || 'Wedding'} mixtape…`,
    'Digging through the crates…',
    'Looking for the right records…',
    'Taping the CD player shut again…',
    'Rewinding the tape with a pencil…',
    'Blowing the dust off the jewel case…',
    'Reading the liner notes…',
    'Skipping the scratched track…',
  ];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, [messages.length]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={132} height={132} viewBox="0 0 120 120">
          {/* disc */}
          <Circle cx={60} cy={60} r={58} fill="#16161b" stroke="#000" strokeWidth={1} />
          {/* iridescent rim — four colored quadrant arcs make the spin visible */}
          <Path d="M114,60 A54,54 0 0 1 60,114" fill="none" stroke={Brand.purpleLight} strokeWidth={7} />
          <Path d="M60,114 A54,54 0 0 1 6,60" fill="none" stroke="#13b488" strokeWidth={7} />
          <Path d="M6,60 A54,54 0 0 1 60,6" fill="none" stroke="#e25a86" strokeWidth={7} />
          <Path d="M60,6 A54,54 0 0 1 114,60" fill="none" stroke="#e0a02a" strokeWidth={7} />
          {/* grooves */}
          <Circle cx={60} cy={60} r={48} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Circle cx={60} cy={60} r={40} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Circle cx={60} cy={60} r={32} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          {/* sheen highlight (asymmetric so rotation reads) */}
          <Path d="M60,60 L60,4 A56,56 0 0 1 99,21 Z" fill="rgba(255,255,255,0.10)" />
          {/* label + spindle hole */}
          <Circle cx={60} cy={60} r={22} fill={Brand.purple} />
          <Circle cx={60} cy={60} r={7} fill={c.bg} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
        </Svg>
      </Animated.View>
      <Text style={[styles.msg, { color: c.textSecondary }]}>{messages[i]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Space.xxl, gap: Space.lg },
  msg: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: Space.lg },
});
