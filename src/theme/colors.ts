/**
 * Colour tokens.
 *
 * Components must only ever reference the semantic tokens in `colors`.
 * The `primitives` ramps exist for the theme definition itself and for
 * documentation; a screen or component importing them is a bug.
 *
 * Source of truth: DESIGN_PLAN.md section 3.1
 */

export const primitives = {
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const;

export const colors = {
  // Surfaces
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSunken: '#F1F5F9',
  surfaceOverlay: 'rgba(15,23,42,0.45)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textHint: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  // Amber is far too light for white text (about 2:1). Dark ink is required.
  textOnAccent: '#451A03',

  // Borders
  borderSubtle: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderStrong: '#94A3B8',
  borderFocus: '#4F46E5',

  // Brand
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primaryDisabled: '#C7D2FE',
  primarySubtle: '#EEF2FF',
  primaryBorder: '#C7D2FE',

  accent: '#F59E0B',
  accentPressed: '#D97706',
  accentDisabled: '#FDE68A',
  accentSubtle: '#FFFBEB',
  accentBorder: '#FDE68A',

  // Feedback
  success: '#059669',
  successSubtle: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',

  warning: '#D97706',
  warningSubtle: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',

  danger: '#DC2626',
  dangerPressed: '#B91C1C',
  dangerDisabled: '#FECACA',
  dangerSubtle: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#991B1B',

  info: '#0284C7',
  infoSubtle: '#F0F9FF',
  infoBorder: '#BAE6FD',
  infoText: '#075985',

  premium: '#7C3AED',
  premiumSubtle: '#F5F3FF',
  premiumBorder: '#DDD6FE',
  premiumText: '#5B21B6',

  // Neutral tone, used for chips that carry no sentiment
  neutralSubtle: '#F1F5F9',
  neutralBorder: '#E2E8F0',
  neutralText: '#475569',

  // Shadows are never pure black; on a cool palette black reads dirty.
  shadowBase: '#0F172A',
} as const;

export type ColorToken = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorToken];

/** The four tones a status chip can take. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'premium' | 'accent';

export interface ToneSet {
  solid: string;
  subtle: string;
  border: string;
  text: string;
}

export const tones: Record<Tone, ToneSet> = {
  neutral: {
    solid: colors.textMuted,
    subtle: colors.neutralSubtle,
    border: colors.neutralBorder,
    text: colors.neutralText,
  },
  info: {
    solid: colors.info,
    subtle: colors.infoSubtle,
    border: colors.infoBorder,
    text: colors.infoText,
  },
  success: {
    solid: colors.success,
    subtle: colors.successSubtle,
    border: colors.successBorder,
    text: colors.successText,
  },
  warning: {
    solid: colors.warning,
    subtle: colors.warningSubtle,
    border: colors.warningBorder,
    text: colors.warningText,
  },
  danger: {
    solid: colors.danger,
    subtle: colors.dangerSubtle,
    border: colors.dangerBorder,
    text: colors.dangerText,
  },
  premium: {
    solid: colors.premium,
    subtle: colors.premiumSubtle,
    border: colors.premiumBorder,
    text: colors.premiumText,
  },
  accent: {
    solid: colors.accent,
    subtle: colors.accentSubtle,
    border: colors.accentBorder,
    text: colors.warningText,
  },
};
