/**
 * Card.
 *
 * Depth comes from border, elevation and surface contrast together, never a
 * hairline border alone (DESIGN_PLAN sections 4.2 and 10).
 *
 * Note: `overflow: 'hidden'` clips the iOS shadow, so a card that needs both a
 * shadow and a rounded clipping child should clip the child instead.
 */

import React, { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type CardVariant = 'flat' | 'raised' | 'interactive' | 'accent' | 'premium';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  /** Required when variant is `interactive`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({
  children,
  variant = 'raised',
  onPress,
  accessibilityLabel,
  style,
  padded = true,
}: CardProps) {
  const theme = useTheme();
  const [pressed, setPressed] = React.useState(false);

  const surface =
    variant === 'accent'
      ? { backgroundColor: theme.colors.accentSubtle, borderColor: theme.colors.accentBorder }
      : variant === 'premium'
        ? { backgroundColor: theme.colors.premiumSubtle, borderColor: theme.colors.premiumBorder }
        : { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle };

  const elevated = variant === 'raised' || variant === 'interactive' || variant === 'premium'
    ? theme.elevation.e1
    : null;

  const base: ViewStyle = {
    borderRadius: theme.radius.lg,
    borderWidth: 0.5,
    ...surface,
    ...(padded ? { padding: theme.layout.cardPadding } : null),
    ...(elevated ?? null),
  };

  if (variant !== 'interactive' || !onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[base, pressed ? { backgroundColor: theme.colors.surfaceSunken } : null, style]}
    >
      {children}
    </Pressable>
  );
}
