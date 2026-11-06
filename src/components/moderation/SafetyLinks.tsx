import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { Type } from '@/lib/theme';

/** Text actions for report, block, hide, and guest removal. Handlers are optional. */
export function SafetyLinks({
  reportLabel,
  onReport,
  blockLabel,
  onBlock,
  hideLabel,
  onHide,
  guestLabel,
  onRemoveGuest,
  tone = 'default',
}: {
  reportLabel?: string;
  onReport?: () => void;
  blockLabel?: string;
  onBlock?: () => void;
  hideLabel?: string;
  onHide?: () => void;
  guestLabel?: string;
  onRemoveGuest?: () => void;
  tone?: 'default' | 'onDark';
}) {
  const c = useC();
  const ink = tone === 'onDark' ? '#fff' : c.accent;
  const danger = tone === 'onDark' ? '#ffd0d0' : c.danger;
  const items = [
    onReport && reportLabel ? { key: 'report', label: reportLabel, onPress: onReport, color: ink } : null,
    onBlock && blockLabel ? { key: 'block', label: blockLabel, onPress: onBlock, color: ink } : null,
    onHide && hideLabel ? { key: 'hide', label: hideLabel, onPress: onHide, color: danger } : null,
    onRemoveGuest && guestLabel ? { key: 'guest', label: guestLabel, onPress: onRemoveGuest, color: danger } : null,
  ].filter((item): item is { key: string; label: string; onPress: () => void; color: string } => item != null);
  if (items.length === 0) return null;
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={item.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={[Type.footnote, styles.link, { color: item.color }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  link: { fontWeight: '600' },
});
