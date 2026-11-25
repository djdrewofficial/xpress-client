import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

import {
  fetchAppNotificationMessages,
  markAppNotification,
} from '@/lib/appNotifications';
import {
  parseAppNotificationUrl,
  targetFromMessage,
  targetFromPushData,
  type AppNotificationTarget,
} from '@/lib/appNotificationRouting';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { syncPushRegistration } from '@/lib/pushRegistration';

/**
 * After sign-in + an event is selected, request permission (once) and register
 * the Expo push token. Also handles notification taps → deep-link targets.
 * Mount only inside the signed-in `(app)` tree — never on the login screen.
 */
export function PushRegistration() {
  const { session, loading } = useAuth();
  const { eventId, loading: eventLoading } = useEvent();
  const router = useRouter();
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;
  const handledUrls = useRef(new Set<string>());

  useEffect(() => {
    if (loading || eventLoading) return;
    const uid = session?.user.id ?? null;
    if (!uid || !eventId) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;
    const timer = setTimeout(() => {
      syncPushRegistration(uid).then(() => {});
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void cancelled;
    };
  }, [session?.user.id, eventId, loading, eventLoading]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const uid = session?.user.id;
    if (!uid) return;
    let sub: { remove: () => void } | null = null;
    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      sub = Notifications.addPushTokenListener(() => {
        syncPushRegistration(uid).then(() => {});
      });
    } catch {
      /* native module unavailable — leave push listeners off */
    }
    return () => sub?.remove();
  }, [session?.user.id]);

  useEffect(() => {
    const navigate = (target: AppNotificationTarget) => {
      if (target.kind === 'screen') {
        const eid = eventIdRef.current
          ? `?eventId=${encodeURIComponent(eventIdRef.current)}`
          : '';
        router.push(`/notification-screen/${target.screenId}${eid}` as never);
      } else if (target.kind === 'tab') {
        router.push(target.href as never);
      }
    };

    const openFromPushData = async (data: Record<string, unknown> | undefined) => {
      const target = targetFromPushData(data);
      const messageId =
        typeof data?.messageId === 'string'
          ? data.messageId
          : target.kind === 'message'
            ? target.messageId
            : null;
      if (messageId) await markAppNotification(messageId, 'opened').catch(() => {});
      if (target.kind === 'message' && messageId && eventIdRef.current) {
        const resolved = await resolveMessageTarget(messageId, eventIdRef.current);
        navigate(resolved);
        return;
      }
      navigate(target);
    };

    const openFromUrl = async (url: string) => {
      if (handledUrls.current.has(url)) return;
      const parsed = parseAppNotificationUrl(url);
      if (!parsed) return;
      handledUrls.current.add(url);
      if (parsed.kind === 'message') {
        await markAppNotification(parsed.messageId, 'opened').catch(() => {});
        if (eventIdRef.current) {
          navigate(await resolveMessageTarget(parsed.messageId, eventIdRef.current));
        }
        return;
      }
      navigate(parsed);
    };

    let responseSub: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications') as typeof import('expo-notifications');
        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, unknown> | undefined;
          void openFromPushData(data);
        });
        Notifications.getLastNotificationResponseAsync()
          .then((response) => {
            if (!response) return;
            const data = response.notification.request.content.data as Record<string, unknown> | undefined;
            void openFromPushData(data);
          })
          .catch(() => {});
      } catch {
        /* native module unavailable — deep-link listeners still work below */
      }
    }

    Linking.getInitialURL()
      .then((url) => {
        if (url) void openFromUrl(url);
      })
      .catch(() => {});
    const linkSub = Linking.addEventListener('url', (event) => {
      void openFromUrl(event.url);
    });

    return () => {
      responseSub?.remove();
      linkSub.remove();
    };
  }, [router]);

  return null;
}

async function resolveMessageTarget(
  messageId: string,
  eventId: string,
): Promise<AppNotificationTarget> {
  const result = await fetchAppNotificationMessages(eventId);
  if (!result.ok) return { kind: 'message', messageId };
  const message = result.messages.find((m) => m.id === messageId);
  if (!message) return { kind: 'message', messageId };
  return targetFromMessage(message);
}
