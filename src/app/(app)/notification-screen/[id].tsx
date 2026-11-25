import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { NotificationScreenView } from '@/components/notifications/NotificationScreenView';
import {
  fetchAppNotificationScreen,
  type AppNotificationScreen,
  type AppScreenButton,
} from '@/lib/appNotifications';
import { hrefForTab, isAppNotifTab } from '@/lib/appNotificationRouting';
import { useEvent } from '@/lib/events';

export default function NotificationScreenRoute() {
  const router = useRouter();
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
    <NotificationScreenView
      loading={loading}
      error={error}
      screen={
        screen
          ? {
              heading: screen.heading || screen.name,
              bodyHtml: screen.body_html,
              embedHtml: screen.embed_html,
              allowedOrigins: screen.render.allowed_origins,
              buttons: screen.buttons,
              djName: screen.dj.name,
              bookingUrl: screen.dj.booking_url,
            }
          : null
      }
      onClose={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      onRetry={() => void load()}
      onButton={onButton}
    />
  );
}
