import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Language is not stored here. Welcome and My Event Settings both call
 * `setLocale` from `@/lib/i18n`, which reads and writes one key:
 * `xpress.language` (`en` | `es`). See `LANGUAGE_PREF_KEY` in preferences.
 */
export { LANGUAGE_PREF_KEY } from '@/lib/preferences';
export type { Locale as AppLanguage } from '@/lib/i18n';

/**
 * Local preference only. There is no server field for this yet — off when unset.
 * Stored as '1' | '0'.
 */
export const MARKETING_TEXTS_KEY = 'xpress.marketingTexts';

export async function readMarketingTexts(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MARKETING_TEXTS_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function writeMarketingTexts(on: boolean): Promise<void> {
  await AsyncStorage.setItem(MARKETING_TEXTS_KEY, on ? '1' : '0');
}
