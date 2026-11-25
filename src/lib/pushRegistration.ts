import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { loadNotificationPrefs, registerPushToken, unregisterPushToken } from '@/lib/appNotifications';
import {
  PUSH_ASKED_KEY,
  readStoredPushToken,
  storePushToken,
  teardownPushRegistration,
} from '@/lib/pushTokenStore';

export { readStoredPushToken, teardownPushRegistration } from '@/lib/pushTokenStore';

function projectId(): string | undefined {
  const eas = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof eas === 'string' && eas ? eas : undefined;
}

/**
 * Request permission (if still undetermined), fetch the Expo push token, and
 * register it with XOS. Safe to call repeatedly — re-registers on token change.
 * No-ops on web (and during static render) so Metro SSR never loads native modules.
 */
export async function syncPushRegistration(authUserId: string | null): Promise<{
  registered: boolean;
  token: string | null;
  reason?: string;
}> {
  if (Platform.OS === 'web') return { registered: false, token: null, reason: 'web' };
  if (!authUserId) return { registered: false, token: null, reason: 'signed_out' };

  // Dynamic requires keep expo-notifications / expo-device off the web SSR graph.
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  const Device = require('expo-device') as typeof import('expo-device');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (!Device.isDevice) return { registered: false, token: null, reason: 'simulator' };

  const prefs = await loadNotificationPrefs(authUserId);
  if (prefs.ok && !prefs.prefs.pushEnabled) {
    const existing = await readStoredPushToken();
    if (existing) {
      await unregisterPushToken(existing);
      await storePushToken(null);
    }
    return { registered: false, token: null, reason: 'prefs_off' };
  }

  // expo-notifications types import PermissionResponse from 'expo', which this
  // SDK build does not re-export cleanly — read the runtime fields via a narrow shape.
  type Perm = { granted?: boolean; canAskAgain?: boolean; ios?: { status?: number } };
  const current = (await Notifications.getPermissionsAsync()) as Perm;
  let granted =
    current.granted === true ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted && current.canAskAgain !== false) {
    await AsyncStorage.setItem(PUSH_ASKED_KEY, '1').catch(() => {});
    const asked = (await Notifications.requestPermissionsAsync()) as Perm;
    granted =
      asked.granted === true ||
      asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) {
    return { registered: false, token: null, reason: 'denied' };
  }

  const id = projectId();
  const tokenResult = id
    ? await Notifications.getExpoPushTokenAsync({ projectId: id })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenResult.data;
  if (!token) return { registered: false, token: null, reason: 'no_token' };

  const previous = await readStoredPushToken();
  const result = await registerPushToken({
    expoPushToken: token,
    platform: Platform.OS,
    deviceName: Device.deviceName,
  });
  if (!result.ok) return { registered: false, token, reason: 'register_failed' };

  await storePushToken(token);
  if (previous && previous !== token) {
    await unregisterPushToken(previous);
  }
  return { registered: true, token };
}
