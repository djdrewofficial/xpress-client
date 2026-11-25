import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeEmbedWebView } from '@/components/notifications/SafeEmbedWebView';
import { Button, FocusedStatusBar, useC } from '@/components/ui';
import type { AppScreenButton } from '@/lib/appNotifications';
import { useT } from '@/lib/i18n';
import { Fonts, Type } from '@/lib/theme';

export type NotificationScreenModel = {
  heading: string;
  bodyHtml: string;
  embedHtml: string | null;
  allowedOrigins: string[];
  buttons: AppScreenButton[];
  djName?: string | null;
  bookingUrl?: string | null;
};

/**
 * Custom notification / embed screen: just the embed (plus a simple close control).
 * Branding lives on the popup, not here.
 */
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
  /** Optional preview controls (dev gallery only). */
  chrome?: ReactNode;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <FocusedStatusBar />
      {chrome}
      <View
        style={[
          styles.bar,
          {
            paddingTop: chrome ? 8 : insets.top + 8,
            borderBottomColor: c.line,
            backgroundColor: c.bg,
          },
        ]}>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
          <Text style={[Type.subhead, { color: c.accent, fontFamily: Fonts.semibold }]}>{t('common.close')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
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
          <View style={styles.web}>
            <SafeEmbedWebView
              bodyHtml={screen.bodyHtml}
              embedHtml={screen.embedHtml}
              allowedOrigins={screen.allowedOrigins}
              background={c.bg}
              ink={c.ink}
              ink2={c.ink2}
              bookingUrl={screen.bookingUrl}
            />
          </View>
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
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  web: { flex: 1 },
  actions: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
