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

export const Radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', sans: 'system-ui' },
  default: { rounded: 'System', sans: 'System' },
})!;
