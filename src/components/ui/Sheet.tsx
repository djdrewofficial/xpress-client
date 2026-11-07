import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frameFor } from '@/lib/frame';
import { Radius, Type } from '@/lib/theme';
import { useC } from './useC';

/**
 * Bottom sheet wrapper.
 * Scrim: black at 45%. Sheet: surface, top radius xl (28), optional grabber.
 * Tap the scrim or the Android back button to close. Pressed scrim is the dismiss target.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frame = frameFor(width);
  const wide = frame.sheetWidth != null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.scrim, wide && styles.scrimWide]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              paddingBottom: Math.max(insets.bottom, 16),
              width: wide ? frame.sheetWidth! : '100%',
              maxHeight: height * 0.85,
              marginBottom: wide ? Math.max(insets.bottom, 24) : 0,
              borderRadius: wide ? Radius.xl : undefined,
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: c.ink3 }]} />
          {title ? <Text style={[Type.headline, { color: c.ink, marginBottom: 12 }]}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  scrimWide: { alignItems: 'center' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: Radius.pill, marginBottom: 14, opacity: 0.45 },
});
