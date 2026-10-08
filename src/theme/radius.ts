/**
 * Corner radii.
 *
 * Source of truth: DESIGN_PLAN.md section 3.4
 */

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
