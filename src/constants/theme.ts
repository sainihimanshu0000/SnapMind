/**
 * Plus Jakarta Sans — calm, modern, premium.
 * Matches SnapMind's soft visual / second-brain aesthetic.
 *
 * Use dedicated weight files; avoid RN fontWeight synthesis on Android.
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const colors = {
  background: '#F8F8F6',
  primary: '#111111',
  secondary: '#6B6B6B',
  accent: '#A16B46',
  surface: '#FFFFFF',
  border: '#E4E3DE',
  borderMuted: '#D9D8D2',
  muted: '#8D8D87',
  danger: '#B04E43',
  softAccent: '#E7B8A5',
  softMint: '#BCD8D1',
  softLavender: '#D6C6E5',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 20,
  fab: 28,
} as const;

export const typography = {
  heading: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: colors.primary,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.primary,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.accent,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.secondary,
  },
};
