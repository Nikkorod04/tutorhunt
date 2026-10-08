/**
 * Motion tokens.
 *
 * Motion explains, it never decorates. The allow list and the banned list
 * live in DESIGN_PLAN.md section 6; durations here are the only values any
 * component may use.
 *
 * When reduce-motion is on, the theme exposes `reduceMotion: true` and
 * consumers must collapse transforms to opacity-only and skip counter
 * roll-ups entirely.
 */

import { Easing } from 'react-native-reanimated';

export const duration = {
  instant: 90,
  fast: 140,
  base: 200,
  slow: 280,
  deliberate: 380,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const spring = {
  damping: 18,
  stiffness: 220,
  mass: 1,
} as const;

export const transform = {
  pressScaleButton: 0.97,
  pressScaleCard: 0.985,
  enterOffsetY: 12,
} as const;

export const stagger = {
  /** Per-item delay for list entrance. */
  listItem: 40,
  /** Only the first N rows animate; beyond this the delay is imperceptible. */
  listItemMax: 8,
} as const;

export type DurationToken = keyof typeof duration;
