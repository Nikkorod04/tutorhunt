/**
 * Theme provider.
 *
 * Light only for the MVP, but every token is named semantically, so adding a
 * dark palette later is a second token set plus a scheme check with no
 * component changes.
 *
 * Fonts are loaded here and rendering is blocked until they resolve, so
 * `fontFamily` values always resolve to a real face and no component needs a
 * fallback path.
 */

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import React, { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { colors, tones, type Tone, type ToneSet } from './colors';
import { elevation } from './elevation';
import { duration, easing, spring, stagger, transform } from './motion';
import { radius } from './radius';
import { layout, space } from './spacing';
import { fontFamily, tabularNums, typography } from './typography';

export interface Theme {
  colors: typeof colors;
  tones: Record<Tone, ToneSet>;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  tabularNums: typeof tabularNums;
  space: typeof space;
  layout: typeof layout;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: {
    duration: typeof duration;
    easing: typeof easing;
    spring: typeof spring;
    transform: typeof transform;
    stagger: typeof stagger;
  };
  /** True when the OS asks for reduced motion. Collapse transforms to opacity. */
  reduceMotion: boolean;
  scheme: 'light';
}

export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // Non-fatal: assume motion is allowed.
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const theme = useMemo<Theme>(
    () => ({
      colors,
      tones,
      typography,
      fontFamily,
      tabularNums,
      space,
      layout,
      radius,
      elevation,
      motion: { duration, easing, spring, transform, stagger },
      reduceMotion,
      scheme: 'light',
    }),
    [reduceMotion],
  );

  // A failed web font request must not leave the whole hosted SPA blank.
  // Native keeps the original font-loading gate, while web can safely use
  // the browser fallback until the bundled font is available.
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
