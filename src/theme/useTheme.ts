import { useContext } from 'react';

import { ThemeContext, type Theme } from './ThemeProvider';

/**
 * Access the design tokens.
 *
 * Components must read colour, spacing, radius, elevation and duration from
 * here. A raw hex value or an arbitrary number in a screen is a bug
 * (blueprint agent rule 25).
 */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return theme;
}
