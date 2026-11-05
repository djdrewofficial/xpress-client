import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Locale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * Language and legal acceptance.
 *
 * Language is stored on the device (AsyncStorage) and, when a session exists,
 * on the auth user (`user_metadata.locale`) — that jsonb bag already exists,
 * so this does not add a column. If `clients.language` is already a column,
 * we read and write it too; a missing column is ignored.
 *
 * Legal acceptance is local only (`xpress.legalAcceptedAt.<uid>`). A durable
 * server record needs a migration Drew runs by hand, for example:
 *   alter table accounts add column if not exists legal_accepted_at timestamptz;
 * This app does not write that column.
 */

const DEVICE_LOCALE_KEY = 'xpress.locale';
const userLocaleKey = (uid: string) => `xpress.locale.${uid}`;
const legalKey = (uid: string) => `xpress.legalAcceptedAt.${uid}`;

const WELCOME_KEY = (uid: string) => `onboarding_welcome_v2.${uid}`;
const TOUR_USER_KEY = (uid: string) => `onboarding_seen_v1.${uid}`;
/** Device flag the Plan screen already checks. */
export const TOUR_DEVICE_KEY = 'onboarding_seen_v1';

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  if (s === 'es' || s === 'spanish' || s === 'español' || s === 'espanol') return 'es';
  if (s === 'en' || s === 'english' || s === 'inglés' || s === 'ingles') return 'en';
  return null;
}

export async function readInitialLocale(uid: string | null, metadata: unknown): Promise<Locale> {
  const fromAccount = normalizeLocale(metadata);
  if (fromAccount) return fromAccount;
  if (uid) {
    const user = normalizeLocale(await AsyncStorage.getItem(userLocaleKey(uid)).catch(() => null));
    if (user) return user;
  }
  const device = normalizeLocale(await AsyncStorage.getItem(DEVICE_LOCALE_KEY).catch(() => null));
  return device ?? 'en';
}

async function writeClientLanguage(clientId: string, locale: Locale) {
  const probe = await supabase.from('clients').select('language').eq('id', clientId).maybeSingle();
  if (probe.error) return;
  await supabase.from('clients').update({ language: locale }).eq('id', clientId);
}

export async function readClientLanguage(clientId: string): Promise<Locale | null> {
  const probe = await supabase.from('clients').select('language').eq('id', clientId).maybeSingle();
  if (probe.error || !probe.data) return null;
  return normalizeLocale((probe.data as { language?: unknown }).language);
}

export async function saveLocale(locale: Locale, opts: { uid?: string | null; clientId?: string | null }) {
  const writes: Promise<unknown>[] = [AsyncStorage.setItem(DEVICE_LOCALE_KEY, locale)];
  if (opts.uid) writes.push(AsyncStorage.setItem(userLocaleKey(opts.uid), locale));
  await Promise.all(writes);
  if (opts.uid) {
    await supabase.auth.updateUser({ data: { locale } }).catch(() => {});
  }
  if (opts.clientId) {
    await writeClientLanguage(opts.clientId, locale).catch(() => {});
  }
}

/** ISO timestamp, device only. See the file comment for the server migration. */
export async function recordLegalAcceptance(uid: string): Promise<string> {
  const at = new Date().toISOString();
  await AsyncStorage.setItem(legalKey(uid), at);
  return at;
}

export async function loadOnboardingFlags(uid: string): Promise<{ welcome: boolean; tour: boolean }> {
  const [welcome, tourUser, tourDevice] = await Promise.all([
    AsyncStorage.getItem(WELCOME_KEY(uid)).catch(() => null),
    AsyncStorage.getItem(TOUR_USER_KEY(uid)).catch(() => null),
    AsyncStorage.getItem(TOUR_DEVICE_KEY).catch(() => null),
  ]);
  return { welcome: welcome != null, tour: tourUser != null || tourDevice != null };
}

export async function markWelcomeDone(uid: string) {
  await AsyncStorage.setItem(WELCOME_KEY(uid), new Date().toISOString());
}

export async function markTourDone(uid: string) {
  await AsyncStorage.multiSet([
    [TOUR_USER_KEY(uid), new Date().toISOString()],
    [TOUR_DEVICE_KEY, '1'],
  ]);
}
