// General Sans is bundled at assets/fonts/. After replacing the placeholder
// .ttf files with real ones, run `npx react-native-asset` (or rebuild) so the
// Android assets pipeline + iOS UIAppFonts pick them up.
export const typography = {
  displayXl: {
    fontSize: 56,
    lineHeight: 60,
    fontFamily: 'GeneralSans-Bold',
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.5,
  },
  displayLg: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: 'GeneralSans-Bold',
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'GeneralSans-Bold',
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'GeneralSans-Semibold',
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'GeneralSans-Regular',
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'GeneralSans-Medium',
    fontWeight: '500' as const,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'GeneralSans-Medium',
    fontWeight: '500' as const,
    letterSpacing: 0.66,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'GeneralSans-Semibold',
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
} as const;

export type Typography = typeof typography;

export const priceText = {
  fontVariant: ['tabular-nums'] as const,
} as const;

export type PriceText = typeof priceText;
