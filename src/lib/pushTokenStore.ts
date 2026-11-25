import AsyncStorage from '@react-native-async-storage/async-storage';

import { unregisterAllPushTokensForUser, unregisterPushToken } from '@/lib/appNotifications';

const TOKEN_KEY = 'xpress.appPushToken';
export const PUSH_ASKED_KEY = 'xpress.pushPermissionAsked';

export async function readStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storePushToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Call from sign-out / account deletion before clearing the session. */
export async function teardownPushRegistration(authUserId: string | null): Promise<void> {
  const token = await readStoredPushToken();
  if (token) await unregisterPushToken(token);
  await unregisterAllPushTokensForUser(authUserId);
  await storePushToken(null);
}

export async function hasAskedPushPermission(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PUSH_ASKED_KEY)) === '1';
  } catch {
    return false;
  }
}
