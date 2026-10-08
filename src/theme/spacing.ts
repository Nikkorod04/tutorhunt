/**
 * Spacing. A strict 4pt rhythm; arbitrary values are not permitted.
 *
 * Source of truth: DESIGN_PLAN.md section 3.3
 */

export const space = {
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

/** Named aliases for the recurring layout distances. */
export const layout = {
  screenPadding: space[16],
  cardPadding: space[16],
  sectionGap: space[24],
  rowGap: space[12],
  inlineGap: space[8],
  /** Minimum touch target. 44 is the floor, 48 is preferred. */
  minTouchTarget: 44,
  preferredTouchTarget: 48,
} as const;

export type SpaceToken = keyof typeof space;
