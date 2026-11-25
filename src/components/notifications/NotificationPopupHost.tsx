import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';

import { NotificationPopup } from '@/components/notifications/NotificationPopup';
import {
  fetchAppNotificationMessages,
  loadNotificationPrefs,
  markAppNotification,
  type AppNotificationPopup,
} from '@/lib/appNotifications';
import { targetFromPopup } from '@/lib/appNotificationRouting';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';

/**
 * Fetches pending popups for the current event and shows one at a time.
 * Lives under EventProvider; does not touch Plan/Music tab screens.
 */
export function NotificationPopupHost() {
  const { session } = useAuth();
  const { eventId } = useEvent();
  const router = useRouter();
  const [queue, setQueue] = useState<AppNotificationPopup[]>([]);
  const [active, setActive] = useState<AppNotificationPopup | null>(null);
  const busy = useRef(false);
  const gen = useRef(0);

  const load = useCallback(async () => {
    const uid = session?.user.id ?? null;
    if (!uid || !eventId) {
      setQueue([]);
      setActive(null);
      return;
    }
    const ticket = ++gen.current;
    const prefs = await loadNotificationPrefs(uid);
    if (gen.current !== ticket) return;
    if (prefs.ok && !prefs.prefs.popupEnabled) {
      setQueue([]);
      setActive(null);
      return;
    }
    const result = await fetchAppNotificationMessages(eventId);
    if (gen.current !== ticket) return;
    if (!result.ok) return;
    setQueue(result.popups);
    setActive((current) => {
      if (current && result.popups.some((p) => p.id === current.id)) return current;
      return result.popups[0] ?? null;
    });
  }, [session?.user.id, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') load();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (active) return;
    if (queue.length === 0) return;
    setActive(queue[0] ?? null);
  }, [queue, active]);

  const advance = useCallback((id: string) => {
    setQueue((prev) => prev.filter((p) => p.id !== id));
    setActive(null);
  }, []);

  const onDismiss = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    const id = active.id;
    try {
      await markAppNotification(id, 'dismissed');
    } finally {
      busy.current = false;
      advance(id);
    }
  }, [active, advance]);

  const onOpen = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    const id = active.id;
    const target = targetFromPopup(active);
    try {
      await markAppNotification(id, 'opened');
    } finally {
      busy.current = false;
      advance(id);
    }
    if (target.kind === 'screen') {
      const eid = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
      router.push(`/notification-screen/${target.screenId}${eid}` as never);
    } else if (target.kind === 'tab') {
      router.push(target.href as never);
    }
  }, [active, advance, eventId, router]);

  return (
    <NotificationPopup
      popup={active}
      visible={!!active}
      onOpen={() => {
        void onOpen();
      }}
      onDismiss={() => {
        void onDismiss();
      }}
    />
  );
}
