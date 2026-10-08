/**
 * Type scale.
 *
 * Inter is loaded by ThemeProvider. Each token names the weight-specific
 * family face and the matching numeric weight so the two never disagree
 * (a mismatch is what produces faux-bold on Android).
 *
 * Source of truth: DESIGN_PLAN.md section 3.2
 */

import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  /** The single hero number on a screen. At most one per screen. */
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  h2: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  /** Chip labels and section eyebrows. Always uppercase with tracking. */
  micro: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;

/**
 * Money and metrics use tabular figures so digits do not jitter while a
 * value animates. Android does not reliably honour fontVariant, which is
 * why StatTile also locks its width while counting.
 */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
