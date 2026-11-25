import { asRecord, mobileJson } from '@/lib/mobileJson';
import {
  parseMessagesPayload,
  parseScreen,
  type AppNotificationMessage,
  type AppNotificationPopup,
  type AppNotificationScreen,
  type AppNotifTapAction,
  type AppScreenButton,
} from '@/lib/appNotificationsParse';
import { supabase } from '@/lib/supabase';

export type {
  AppNotificationMessage,
  AppNotificationPopup,
  AppNotificationScreen,
  AppNotifTab,
  AppNotifTapAction,
  AppScreenButton,
} from '@/lib/appNotificationsParse';

export {
  APP_NOTIF_TABS,
  parseMessage,
  parseMessagesPayload,
  parsePopup,
  parseScreen,
} from '@/lib/appNotificationsParse';

export type AppNotificationPrefs = {
  pushEnabled: boolean;
  popupEnabled: boolean;
};

export type MessagesResult =
  | { ok: true; messages: AppNotificationMessage[]; popups: AppNotificationPopup[] }
  | { ok: false; status: number; error: string };

export type ScreenResult =
  | { ok: true; screen: AppNotificationScreen }
  | { ok: false; status: number; error: string };

export type PrefsResult =
  | { ok: true; prefs: AppNotificationPrefs }
  | { ok: false; status: number; error: string };

/** Register (or refresh) this device's Expo push token with XOS. */
export async function registerPushToken(input: {
  expoPushToken: string;
  platform: string;
  deviceName?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const body: Record<string, unknown> = {
    expoPushToken: input.expoPushToken,
    platform: input.platform,
  };
  if (input.deviceName) body.deviceName = input.deviceName;
  const result = await mobileJson('POST', '/api/mobile/app-notifications/register-push', body);
  if (!result.ok) return { ok: false, status: result.status, error: result.error };
  return { ok: true };
}

/**
 * Deactivate this device's token so XOS stops pushing here.
 * Uses RLS on `app_device_tokens` (no dedicated unregister HTTP route).
 */
export async function unregisterPushToken(expoPushToken: string | null): Promise<void> {
  const token = (expoPushToken ?? '').trim();
  if (!token) return;
  await supabase
    .from('app_device_tokens')
    .update({ is_active: false, last_seen_at: new Date().toISOString() })
    .eq('expo_push_token', token);
}

/** Deactivate every active token for the signed-in user (sign-out / delete account). */
export async function unregisterAllPushTokensForUser(authUserId: string | null): Promise<void> {
  const uid = (authUserId ?? '').trim();
  if (!uid) return;
  await supabase
    .from('app_device_tokens')
    .update({ is_active: false, last_seen_at: new Date().toISOString() })
    .eq('auth_user_id', uid)
    .eq('is_active', true);
}

export async function fetchAppNotificationMessages(eventId: string): Promise<MessagesResult> {
  const result = await mobileJson(
    'GET',
    `/api/mobile/app-notifications/messages?eventId=${encodeURIComponent(eventId)}`,
  );
  if (!result.ok) return { ok: false, status: result.status, error: result.error };
  return { ok: true, ...parseMessagesPayload(result.data) };
}

export async function markAppNotification(
  messageId: string,
  action: 'opened' | 'dismissed',
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const result = await mobileJson('POST', `/api/mobile/app-notifications/messages/${messageId}`, {
    action,
  });
  if (!result.ok) return { ok: false, status: result.status, error: result.error };
  return { ok: true };
}

export async function fetchAppNotificationScreen(
  screenId: string,
  eventId: string,
): Promise<ScreenResult> {
  const result = await mobileJson(
    'GET',
    `/api/mobile/app-notifications/screens/${encodeURIComponent(screenId)}?eventId=${encodeURIComponent(eventId)}`,
  );
  if (!result.ok) return { ok: false, status: result.status, error: result.error };
  const screen = parseScreen(asRecord(result.data).screen);
  if (!screen) return { ok: false, status: 500, error: 'invalid_screen' };
  return { ok: true, screen };
}

/**
 * Prefs live in `app_notification_prefs` (RLS: own row). Missing row = both on.
 * No dedicated mobile HTTP endpoint in the contract — read/write via Supabase.
 */
export async function loadNotificationPrefs(authUserId: string | null): Promise<PrefsResult> {
  const uid = (authUserId ?? '').trim();
  if (!uid) return { ok: false, status: 401, error: 'signed_out' };
  const { data, error } = await supabase
    .from('app_notification_prefs')
    .select('push_enabled, popup_enabled')
    .eq('auth_user_id', uid)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: true, prefs: { pushEnabled: true, popupEnabled: true } };
  return {
    ok: true,
    prefs: {
      pushEnabled: data.push_enabled !== false,
      popupEnabled: data.popup_enabled !== false,
    },
  };
}

export async function saveNotificationPrefs(
  authUserId: string | null,
  prefs: AppNotificationPrefs,
): Promise<PrefsResult> {
  const uid = (authUserId ?? '').trim();
  if (!uid) return { ok: false, status: 401, error: 'signed_out' };
  const { error } = await supabase.from('app_notification_prefs').upsert(
    {
      auth_user_id: uid,
      push_enabled: prefs.pushEnabled,
      popup_enabled: prefs.popupEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'auth_user_id' },
  );
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, prefs };
}
