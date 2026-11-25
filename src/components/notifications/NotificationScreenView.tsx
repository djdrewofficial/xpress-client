import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { SafeEmbedWebView } from '@/components/notifications/SafeEmbedWebView';
import { Button, FocusedStatusBar, useC } from '@/components/ui';
import type { AppScreenButton } from '@/lib/appNotifications';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Space, Type } from '@/lib/theme';

export type NotificationScreenModel = {
  heading: string;
  bodyHtml: string;
  embedHtml: string | null;
  allowedOrigins: string[];
  buttons: AppScreenButton[];
  djName?: string | null;
  bookingUrl?: string | null;
};

/** Branded custom notification screen: hero + embed card + action buttons. */
export function NotificationScreenView({
  screen,
  loading,
  error,
  onClose,
  onRetry,
  onButton,
  chrome,
}: {
  screen: NotificationScreenModel | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetry?: () => void;
  onButton: (button: AppScreenButton) => void;
  /** Optional preview controls rendered above the hero. */
  chrome?: ReactNode;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const heading = screen?.heading || t('notif.screenFallback');
  const djName = screen?.djName?.trim() || null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <FocusedStatusBar />
      {chrome}
      <LinearGradient
        colors={[Brand.purple, Brand.purpleMid, '#2c1d57']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: chrome ? 16 : insets.top + 12 }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10} style={styles.closeHit}>
            <Text style={styles.closeTxt}>{t('common.close')}</Text>
          </Pressable>
          <Logo variant="full" height={20} tone="#ffffff" />
          <View style={styles.redAccent} />
        </View>
        <Text style={styles.from}>{t('notif.popupEyebrow')}</Text>
        {djName ? <Text style={styles.dj}>{djName}</Text> : null}
        <Text style={styles.heading}>{heading}</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <View style={[styles.skeleton, { backgroundColor: c.surface2 }]} />
          <Text style={[Type.footnote, { color: c.ink3, marginTop: 12 }]}>{t('notif.embedLoading')}</Text>
        </View>
      ) : error || !screen ? (
        <View style={styles.center}>
          <Text style={[Type.body, { color: c.ink2, textAlign: 'center' }]}>{t('notif.screenFailed')}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={{ marginTop: 12 }}>
              <Text style={[Type.subhead, { color: c.accent }]}>{t('common.tryAgain')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: Space.lg, paddingBottom: 12, gap: 14, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled">
            <SafeEmbedWebView
              bodyHtml={screen.bodyHtml}
              embedHtml={screen.embedHtml}
              allowedOrigins={screen.allowedOrigins}
              background={c.surface}
              ink={c.ink}
              ink2={c.ink2}
              bookingUrl={screen.bookingUrl}
              minHeight={460}
            />
          </ScrollView>
          {screen.buttons.length > 0 ? (
            <View
              style={[
                styles.actions,
                { paddingBottom: insets.bottom + 12, borderTopColor: c.line, backgroundColor: c.bg },
              ]}>
              {screen.buttons.map((button, index) => (
                <Button
                  key={`${button.label}-${index}`}
                  label={button.label}
                  variant={index === 0 ? 'primary' : 'secondary'}
                  onPress={() => onButton(button)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeHit: { minWidth: 56 },
  closeTxt: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  redAccent: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.red,
  },
  from: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  dj: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.28,
    color: '#ffffff',
    marginTop: 4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeleton: {
    width: '86%',
    height: 220,
    borderRadius: Radius.lg,
  },
  actions: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
