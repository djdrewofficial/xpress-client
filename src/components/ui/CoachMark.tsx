import { StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Type } from '@/lib/theme';
import { Button } from './Button';
import { useC } from './useC';

/**
 * P2/Coach mark — a dismissible tip card (~300 wide).
 * Overline "QUICK TIP" (override with `title`), headline, body, optional footnote, Got it.
 * `visible` false renders nothing. Parent positions it (Timeline first-visit anchors it near +).
 * Shows once is the caller's job — this component only draws and dismisses.
 */
export function CoachMark({
  visible,
  title = 'Quick tip',
  headline,
  body,
  footnote,
  dismissLabel = 'Got it',
  onDismiss,
}: {
  visible: boolean;
  title?: string;
  headline: string;
  body: string;
  footnote?: string;
  dismissLabel?: string;
  onDismiss: () => void;
}) {
  const c = useC();
  if (!visible) return null;
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
      <Text style={[Type.overline, { color: c.accent }]}>{title}</Text>
      <Text style={[Type.headline, { color: c.ink, marginTop: 8 }]}>{headline}</Text>
      <Text style={[Type.body, { color: c.ink2, marginTop: 6 }]}>{body}</Text>
      {footnote ? <Text style={[Type.footnote, { color: c.ink3, marginTop: 8 }]}>{footnote}</Text> : null}
      <View style={{ marginTop: 14 }}>
        <Button label={dismissLabel} onPress={onDismiss} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 300, borderRadius: Radius.xl, padding: 16 },
});
