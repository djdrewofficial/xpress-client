/* Xpress Entertainment brand — matches the XOS web Tailwind theme.
   Primary #4b328e (purple), secondary #fe3a3b (red).
   Primary type: DM Serif Display (display), secondary: Montserrat (UI/body). */

export const Brand = {
  purple: '#4b328e',
  purpleLight: '#8b6fd6',
  purpleLighter: '#b9a5ef',
  red: '#fe3a3b',
  redLight: '#ff6f70',
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

/* Brand type. `display` = DM Serif Display (logo/headlines); the rest are
   Montserrat weights (the global Text patch maps fontWeight → these). */
export const Fonts = {
  display: 'DMSerifDisplay_400Regular',
  body: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  heavy: 'Montserrat_800ExtraBold',
} as const;
