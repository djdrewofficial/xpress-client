import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Shadow, Type } from '@/lib/theme';

export type NotificationPopupModel = {
  id: string;
  title: string;
  body: string;
};

export type NotificationPopupBrand = {
  /** DJ display name when known. Falls back to logo-only branding. */
  djName?: string | null;
  /** Optional headshot URL for the DJ. */
  djPhotoUrl?: string | null;
};

/** Branded in-app popup for XOS couple-app messages. */
export function NotificationPopup({
  popup,
  visible,
  onOpen,
  onDismiss,
  brand,
}: {
  popup: NotificationPopupModel | null;
  visible: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  brand?: NotificationPopupBrand;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (!visible || !popup) {
      opacity.setValue(0);
      scale.setValue(0.94);
      translateY.setValue(18);
      return;
    }
    opacity.setValue(0);
    scale.setValue(0.94);
    translateY.setValue(18);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, popup?.id, opacity, scale, translateY]);

  if (!popup) return null;

  const djName = brand?.djName?.trim() || null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View
          style={[
            styles.card,
            Shadow.card,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              opacity,
              transform: [{ scale }, { translateY }],
            },
          ]}>
          <LinearGradient
            colors={[Brand.purple, Brand.purpleMid, '#3a246f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.band}>
            <View style={styles.bandTop}>
              <Logo variant="full" height={22} tone="#ffffff" />
              <View style={styles.redAccent} />
            </View>
            <Text style={styles.bandEyebrow}>{t('notif.popupEyebrow')}</Text>
            {djName ? <Text style={styles.bandDj}>{djName}</Text> : null}
          </LinearGradient>

          <View style={styles.bodyWrap}>
            <Text style={[styles.title, { color: c.ink }]}>{popup.title}</Text>
            {popup.body ? <Text style={[styles.body, { color: c.ink2 }]}>{popup.body}</Text> : null}
            <Button label={t('notif.open')} onPress={onOpen} style={{ marginTop: 8 }} />
            <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={10} style={styles.dismiss}>
              <Text style={[Type.subhead, { color: c.ink3, fontFamily: Fonts.semibold }]}>{t('notif.dismiss')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 12, 30, 0.58)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  band: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 8,
  },
  bandTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redAccent: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.red,
  },
  bandEyebrow: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
  },
  bandDj: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    color: '#ffffff',
  },
  bodyWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.26,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
