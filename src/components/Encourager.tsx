import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Logo } from '@/components/Logo';
import { useC } from '@/components/ui';
import { Space } from '@/lib/theme';

/* Branded encouragement for the empty space at the bottom of a page: the Xpress
   [X] mark + a cute line riffing on "The Ultimate Wedding Experience". A random
   line is chosen each time the component mounts, so every page shows a fresh one. */

const LINES = [
  'The pieces of your experience are coming together',
  'Building your ultimate wedding experience, one detail at a time',
  'Piece by piece, your perfect day comes together',
  'Every answer brings your big day to life',
  'Crafting the ultimate wedding experience — together',
  'Your experience is taking shape beautifully',
  'The ultimate wedding experience starts with you',
  "You're composing something unforgettable",
  'Every little detail makes the day more you',
  'Great experiences are built one detail at a time',
  "Can't wait to bring your ultimate experience to life",
  'Your story, your vibe, your ultimate experience',
];

export function Encourager({ style }: { style?: ViewStyle }) {
  const c = useC();
  // Pick once per mount → a new line on every page / revisit.
  const line = useMemo(() => LINES[Math.floor(Math.random() * LINES.length)], []);

  return (
    <View style={[styles.wrap, style]}>
      <Logo variant="icon" height={54} tone={c.textTertiary} style={{ opacity: 0.4 }} />
      <Text style={[styles.line, { color: c.textTertiary }]}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: Space.xxl, paddingBottom: Space.lg, paddingHorizontal: Space.xl, gap: Space.md },
  line: { fontSize: 13.5, fontWeight: '600', textAlign: 'center', lineHeight: 19, letterSpacing: 0.2 },
});
