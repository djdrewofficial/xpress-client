/**
 * Colors for the shared SegmentedControl (Songs / Notes / Search / Import, etc.).
 * Selected uses brand purple; dark mode uses a lighter purple so the thumb stays obvious
 * on a near-black track. Red is reserved for a thin selected accent, not the fill.
 *
 * Hex values match `Brand` / `Colors` in theme.ts (kept as literals so node:test can load
 * this module without the Expo `@/` path alias).
 */
export function segmentedControlColors(scheme: 'light' | 'dark') {
  const dark = scheme === 'dark';
  return {
    trackBackground: dark ? '#251b3e' : '#e9e2f5',
    trackBorder: dark ? '#6a4fb8' : '#e4dcf1',
    selectedBackground: dark ? '#8b6fd6' : '#4b328e',
    selectedLabel: '#ffffff',
    unselectedLabel: dark ? '#b9aed0' : '#5a4f6e',
    pressedBackground: dark ? '#1c1430' : '#f0eafb',
    selectedAccent: '#fe3a3b',
  } as const;
}

/** Minimum thumb height so tabs stay easy to tap on iPhone. */
export const SEGMENTED_MIN_HEIGHT = 44;
