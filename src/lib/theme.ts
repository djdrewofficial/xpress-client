/* Xpress Entertainment — Proposal v2 theme.
   Primary CTA is brand red #fe3a3b. Purple remains the brand accent.
   Display: DM Serif Display (regular + italic accent). UI: Montserrat.

   Legacy names (text, bg, card, …) stay so existing screens keep compiling.
   They alias the Proposal v2 semantic tokens, so the current UI picks up
   the new palette without a screen rewrite. New screens should prefer the
   v2 names (ink, surface, accent, red, …) and the Type scale. */

import type { TextStyle, ViewStyle } from 'react-native';

export const Brand = {
  purple: '#4b328e',
  purpleLight: '#8b6fd6',
  purpleLighter: '#b9a5ef',
  purpleMid: '#6a4fb8',
  purpleDeep: '#2c1d57',
  red: '#fe3a3b',
  redLight: '#ff6f70',
  white: '#ffffff',
  black: '#000000',
} as const;

/** Status hues from the Brand collection. Not scheme-dependent. */
export const Status = {
  success: '#22c55e',
  successStrong: '#16a34a',
  notice: '#0f8f70',
  error: '#dc2626',
  archive: '#e0584f',
  delete: '#c0392b',
  gold: '#d9a521',
} as const;

export type Palette = {
  /** @deprecated Prefer `ink`. Kept so existing screens compile. */
  text: string;
  /** @deprecated Prefer `ink2`. */
  textSecondary: string;
  /** @deprecated Prefer `ink3`. */
  textTertiary: string;
  bg: string;
  /** @deprecated Prefer `surface`. */
  card: string;
  /** @deprecated Prefer `surface2`. */
  cardAlt: string;
  /** @deprecated Prefer `line`. */
  border: string;
  /** White label on a saturated brand fill. Stays white in both schemes. */
  onBrand: string;
  surface: string;
  surface2: string;
  sunken: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accent2: string;
  accentTint: string;
  onAccent: string;
  hero: string;
  night: string;
  red: string;
  redInk: string;
  redTint: string;
  onRed: string;
  lavender: string;
  success: string;
  danger: string;
};

const light = {
  text: '#120c1e',
  textSecondary: '#5a4f6e',
  textTertiary: '#9b8fb5',
  bg: '#f6f2ff',
  card: '#ffffff',
  cardAlt: '#f0eafb',
  border: '#e4dcf1',
  onBrand: '#ffffff',
  surface: '#ffffff',
  surface2: '#f0eafb',
  sunken: '#e9e2f5',
  ink: '#120c1e',
  ink2: '#5a4f6e',
  ink3: '#9b8fb5',
  line: '#e4dcf1',
  accent: '#4b328e',
  accent2: '#6b4bc0',
  accentTint: '#ece4fa',
  onAccent: '#ffffff',
  hero: '#2a1a52',
  night: '#120c1e',
  red: '#fe3a3b',
  redInk: '#d42b2c',
  redTint: '#ffe8e8',
  onRed: '#ffffff',
  lavender: '#dbaae1',
  success: '#2e8b62',
  danger: '#c62828',
} as const satisfies Palette;

const dark = {
  text: '#ffffff',
  textSecondary: '#b9aed0',
  textTertiary: '#7f7399',
  bg: '#120c1e',
  card: '#1c1430',
  cardAlt: '#251b3e',
  border: '#2e2447',
  onBrand: '#ffffff',
  surface: '#1c1430',
  surface2: '#251b3e',
  sunken: '#0d0916',
  ink: '#ffffff',
  ink2: '#b9aed0',
  ink3: '#7f7399',
  line: '#2e2447',
  accent: '#dbaae1',
  accent2: '#9c7be0',
  accentTint: '#2a1a52',
  onAccent: '#120c1e',
  hero: '#2a1a52',
  night: '#0b0714',
  red: '#fe3a3b',
  redInk: '#ff6b6b',
  redTint: '#3a1424',
  onRed: '#ffffff',
  lavender: '#dbaae1',
  success: '#4cb98a',
  danger: '#ff6b6b',
} as const satisfies Palette;

export const Colors = { light, dark } as const;

export type Scheme = keyof typeof Colors;

/** Soft elevation. `card` matches Shadow/Card. `button` is the red-CTA lift. */
export const Shadow = {
  card: {
    shadowColor: '#1a1333',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    shadowColor: '#4b328e',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const satisfies Record<string, ViewStyle>;

/** p/radius. `lg` is 22 in Proposal v2 (v1 layout lg was 20). */
export const Radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/**
 * Spacing. Numeric keys are the v2 scale (`p/space/*`):
 * 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 12=48.
 * Named keys are the legacy scale existing screens already use.
 */
export const Space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/* Brand type. `display` = DM Serif Display. `displayItalic` is the accent face
   (Proposal v2/Accent). Montserrat weights: the global Text patch maps
   fontWeight → these when a style does not set fontFamily. */
export const Fonts = {
  display: 'DMSerifDisplay_400Regular',
  displayItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  heavy: 'Montserrat_800ExtraBold',
} as const;

/** Proposal v2 type scale. Set `fontFamily` explicitly so the italic accent is not patched. */
export const Type = {
  display: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -0.64 },
  largeTitle: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: -0.34 },
  title: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.26 },
  accent: { fontFamily: Fonts.displayItalic, fontSize: 34, lineHeight: 36, letterSpacing: -0.34 },
  numeral: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 26, letterSpacing: 0 },
  headline: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  callout: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  subhead: { fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 19, letterSpacing: 0 },
  footnote: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  overline: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 3.08, textTransform: 'uppercase' },
  label: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, textTransform: 'uppercase' },
  button: { fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3 },
  tab: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;

/** Named gradients from the v2 paint styles. Primary CTAs are solid `red`, not a gradient. */
export const Gradients = {
  brandButton: [Brand.purple, Brand.purpleLight] as const,
  loginHero: ['#120c1e', '#2a1a52', '#4b328e'] as const,
  countdownHero: {
    night: '#120c1e',
    hero: '#2a1a52',
    glow: '#dbaae1',
  },
} as const;

/** Reference frame from the v2 artboards. Layout should still follow safe area, not these constants. */
export const Screen = {
  width: 402,
  height: 874,
  safeAreaTop: 54,
  homeIndicator: 34,
  tabBarHeight: 83,
  navBarHeight: 44,
} as const;
