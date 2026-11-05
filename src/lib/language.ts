import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared with the Welcome screen. Do not rename.
 * Values are exactly 'en' | 'es'.
 */
export const LANGUAGE_PREF_KEY = 'xpress.language';

/**
 * Local preference only. There is no server field for this yet — off when unset.
 * Stored as '1' | '0'.
 */
export const MARKETING_TEXTS_KEY = 'xpress.marketingTexts';

export type AppLanguage = 'en' | 'es';

export async function readLanguage(): Promise<AppLanguage> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_PREF_KEY);
    return value === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export async function writeLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_PREF_KEY, language);
}

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
