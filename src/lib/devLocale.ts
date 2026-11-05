import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useT, type Locale } from '@/lib/i18n';

/** Dev previews accept `?lang=es` so a still can be shot in either language. */
export function useDevLocale() {
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const { setLocale } = useT();
  const value = Array.isArray(lang) ? lang[0] : lang;
  useEffect(() => {
    if (value === 'es' || value === 'en') setLocale(value as Locale);
  }, [value, setLocale]);
}
