import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Shadow, Type } from '@/lib/theme';

export type NotificationPopupModel = {
  id: string;
  title: string;
  body: string;
};

/** Clean centered card for an in-app popup message from XOS. */
export function NotificationPopup({
  popup,
  visible,
  onOpen,
  onDismiss,
}: {
  popup: NotificationPopupModel | null;
  visible: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  if (!popup) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>{t('notif.popupEyebrow')}</Text>
          <Text style={[styles.title, { color: c.ink }]}>{popup.title}</Text>
          {popup.body ? <Text style={[styles.body, { color: c.ink2 }]}>{popup.body}</Text> : null}
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: Brand.purple }]}>
            <Text style={styles.primaryTxt}>{t('notif.open')}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={10} style={styles.dismiss}>
            <Text style={[Type.subhead, { color: c.ink3, fontFamily: Fonts.semibold }]}>{t('notif.dismiss')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 12, 30, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 12,
  },
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 23,
  },
  primary: {
    marginTop: 8,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryTxt: {
    color: '#fff',
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
