/* Xpress Entertainment brand — matches the XOS web Tailwind theme. */
import { Platform } from 'react-native';

export const Brand = {
  purple: '#4b328e',
  purpleLight: '#8b6fd6',
  purpleLighter: '#b9a5ef',
} as const;

export const Colors = {
  light: {
    text: '#18181b',
    textSecondary: '#71717a',
    textTertiary: '#a1a1aa',
    bg: '#fafafa',
    card: '#ffffff',
    cardAlt: '#f4f4f5',
    border: 'rgba(0,0,0,0.07)',
    onBrand: '#ffffff',
  },
  dark: {
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    bg: '#0a0a0b',
    card: '#161618',
    cardAlt: '#1f1f23',
    border: 'rgba(255,255,255,0.08)',
    onBrand: '#ffffff',
  },
} as const;

export type Scheme = keyof typeof Colors;

/** Soft accent fills per module/category (bg + fg), brand-leaning. */
export const Accents = {
  music: { bg: '#E1F5EE', fg: '#0F6E56' },
  timeline: { bg: '#EEEDFE', fg: '#3C3489' },
  vendors: { bg: '#FAEEDA', fg: '#854F0B' },
  questions: { bg: '#FBEAF0', fg: '#993556' },
  moments: { bg: '#FAECE7', fg: '#993C1D' },
} as const;

/**
 * Per-category palettes for the expanded plan cards.
 * `tint` = soft light-mode fill, `tintDark` = deep low-saturation dark-mode fill,
 * `accent` = saturated ink for text/ring, `grad` = two-stop gradient for icon badge + ring.
 */
export const CategoryThemes = [
  { tint: '#EFEEFE', tintDark: '#1B1733', accent: '#5B4BD0', grad: ['#6D5BD0', '#8B6FD6'] }, // violet
  { tint: '#E3F6EF', tintDark: '#0F2620', accent: '#0F8F70', grad: ['#13B488', '#0F8F70'] }, // teal
  { tint: '#FBF0DA', tintDark: '#2A2110', accent: '#B5790F', grad: ['#E0A02A', '#C98417'] }, // amber
  { tint: '#FBEAF1', tintDark: '#2A1019', accent: '#B23A66', grad: ['#E25A86', '#B23A66'] }, // rose
  { tint: '#FBEBE3', tintDark: '#2A1610', accent: '#C0481F', grad: ['#E5683B', '#C0481F'] }, // coral
  { tint: '#E7F0FB', tintDark: '#101F2C', accent: '#1E6FB8', grad: ['#3C92E0', '#1E6FB8'] }, // blue
] as const;

export type CategoryTheme = (typeof CategoryThemes)[number];

/** Soft elevation that reads on both schemes. */
export const Shadow = {
  card: {
    shadowColor: '#1a1333',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

export const Radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', sans: 'system-ui' },
  default: { rounded: 'System', sans: 'System' },
})!;
