import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useScheme } from './useC';

/**
 * Status bar for the screen that is actually showing.
 * React Native keeps every mounted `StatusBar` in a stack, and tabs stay
 * mounted, so a light-content bar on the dark Home hero was left on top of
 * the light My Event page (white icons on the lavender safe area).
 * Unmounting it on blur lets the focused screen win.
 */
export function FocusedStatusBar({ variant = 'chrome' }: { variant?: 'hero' | 'chrome' }) {
  const focused = useIsFocused();
  const scheme = useScheme();
  if (!focused) return null;
  const style = variant === 'hero' || scheme === 'dark' ? 'light' : 'dark';
  return <StatusBar style={style} />;
}
