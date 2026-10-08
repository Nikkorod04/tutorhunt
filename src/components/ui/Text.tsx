/**
 * The only way text is rendered in this app.
 *
 * Picking a token rather than a size keeps the type scale honest; a screen
 * that invents its own fontSize is a bug (DESIGN_PLAN section 3.2).
 */

import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type TypographyToken } from '@/theme';

export interface TextProps extends RNTextProps {
  /** Type-scale token. Defaults to `body`. */
  token?: TypographyToken;
  /** Overrides the token colour. Prefer passing a semantic token. */
  color?: string;
  align?: TextStyle['textAlign'];
  /** Tabular figures, for money and metrics. */
  tabular?: boolean;
}

export function Text({
  token = 'body',
  color,
  align,
  tabular = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  return (
    <RNText
      {...rest}
      style={[
        theme.typography[token],
        { color: color ?? theme.colors.textPrimary },
        align ? { textAlign: align } : null,
        tabular ? theme.tabularNums : null,
        style,
      ]}
    />
  );
}
