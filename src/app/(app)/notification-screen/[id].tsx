import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeEmbedWebView } from '@/components/notifications/SafeEmbedWebView';
import { FocusedStatusBar, useC } from '@/components/ui';
import {
  fetchAppNotificationScreen,
  type AppNotificationScreen,
  type AppScreenButton,
} from '@/lib/appNotifications';
import { hrefForTab, isAppNotifTab } from '@/lib/appNotificationRouting';
import { useEvent } from '@/lib/events';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Type } from '@/lib/theme';

export default function NotificationScreenRoute() {
  const c = useC();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId: eventFromContext } = useEvent();
  const params = useLocalSearchParams<{ id: string; eventId?: string }>();
  const screenId = typeof params.id === 'string' ? params.id : '';
  const eventId =
    (typeof params.eventId === 'string' && params.eventId) || eventFromContext || '';

  const [screen, setScreen] = useState<AppNotificationScreen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!screenId || !eventId) {
      setError('missing');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await fetchAppNotificationScreen(screenId, eventId);
    if (!result.ok) {
      setError(result.error || 'failed');
      setScreen(null);
      setLoading(false);
      return;
    }
    setScreen(result.screen);
    setLoading(false);
  }, [screenId, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const onButton = useCallback(
    (button: AppScreenButton) => {
      if (button.action === 'dismiss') {
        if (router.canGoBack()) router.back();
        else router.replace('/');
        return;
      }
      if (button.action === 'url' && button.url) {
        Linking.openURL(button.url).catch(() => {});
        return;
      }
      if (button.action === 'tab' && button.tab) {
        const tab = isAppNotifTab(button.tab) ? button.tab : 'home';
        router.replace(hrefForTab(tab) as never);
      }
    },
    [router],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <FocusedStatusBar />
      <View style={[styles.nav, { borderBottomColor: c.line }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          hitSlop={10}
          accessibilityRole="button">
          <Text style={[Type.subhead, { color: c.accent }]}>{t('common.close')}</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.ink }]} numberOfLines={1}>
          {screen?.heading || screen?.name || t('notif.screenFallback')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error || !screen ? (
        <View style={styles.center}>
          <Text style={[Type.body, { color: c.ink2, textAlign: 'center' }]}>{t('notif.screenFailed')}</Text>
          <Pressable onPress={() => void load()} style={{ marginTop: 12 }}>
            <Text style={[Type.subhead, { color: c.accent }]}>{t('common.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.web}>
            <SafeEmbedWebView
              bodyHtml={screen.body_html}
              embedHtml={screen.embed_html}
              allowedOrigins={screen.render.allowed_origins}
              background={c.bg}
              ink={c.ink}
              ink2={c.ink2}
            />
          </View>
          {screen.buttons.length > 0 ? (
            <View style={[styles.actions, { paddingBottom: insets.bottom + 12, borderTopColor: c.line }]}>
              {screen.buttons.map((button, index) => (
                <Pressable
                  key={`${button.label}-${index}`}
                  onPress={() => onButton(button)}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: index === 0 ? Brand.purple : c.surface2,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.actionTxt,
                      { color: index === 0 ? '#fff' : c.ink },
                    ]}>
                    {button.label}
                  </Text>
                </Pressable>
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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 16,
    marginHorizontal: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  web: { flex: 1 },
  actions: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionTxt: { fontFamily: Fonts.semibold, fontSize: 16 },
});
