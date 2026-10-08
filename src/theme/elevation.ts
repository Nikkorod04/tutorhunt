/**
 * Elevation and shadow.
 *
 * Depth never comes from a shadow alone: border, elevation and surface
 * contrast escalate together. Source of truth: DESIGN_PLAN.md section 3.5.
 *
 * Platform caveats handled here:
 * - Android ignores shadowColor below API 28 and draws its own shadow from
 *   `elevation`, so the two platforms will not match exactly. We accept that
 *   rather than faking it with a second view.
 * - Android only draws `elevation` when the view has a backgroundColor, so
 *   every elevated component must set one.
 * - `overflow: 'hidden'` clips the iOS shadow; wrap the child instead of
 *   clipping the card.
 */

import { Platform, type ViewStyle } from 'react-native';

import { colors } from './colors';

export type ElevationToken = 'e0' | 'e1' | 'e2' | 'e3' | 'e4';

interface ElevationSpec {
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  androidElevation: number;
}

const spec: Record<ElevationToken, ElevationSpec> = {
  e0: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, androidElevation: 0 },
  e1: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, androidElevation: 2 },
  e2: { shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, androidElevation: 4 },
  e3: { shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, androidElevation: 8 },
  e4: { shadowOpacity: 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, androidElevation: 12 },
};

function build(token: ElevationToken): ViewStyle {
  const s = spec[token];
  if (s.androidElevation === 0) return {};

  const base: ViewStyle = { shadowColor: colors.shadowBase };

  if (Platform.OS === 'android') {
    return { ...base, elevation: s.androidElevation };
  }

  return {
    ...base,
    shadowOpacity: s.shadowOpacity,
    shadowRadius: s.shadowRadius,
    shadowOffset: s.shadowOffset,
  };
}

export const elevation: Record<ElevationToken, ViewStyle> = {
  e0: build('e0'),
  e1: build('e1'),
  e2: build('e2'),
  e3: build('e3'),
  e4: build('e4'),
};
