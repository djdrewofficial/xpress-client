import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Scheme } from '@/lib/theme';

const SchemeOverride = createContext<Scheme | null>(null);

/** Force a scheme for a subtree (the dev gallery uses this to preview light and dark). */
export function ThemeSchemeOverride({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  return <SchemeOverride.Provider value={scheme}>{children}</SchemeOverride.Provider>;
}

export function useScheme(): Scheme {
  const override = useContext(SchemeOverride);
  const system = (useColorScheme() ?? 'light') as Scheme;
  return override ?? system;
}

/** Active palette. Legacy keys (`text`, `card`, …) and v2 keys (`ink`, `surface`, …) both resolve. */
export function useC() {
  return Colors[useScheme()];
}
