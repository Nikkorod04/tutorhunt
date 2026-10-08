/**
 * Icon-only button. Always requires an accessibility label, because the icon
 * carries no text for a screen reader (DESIGN_PLAN section 8).
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from './icon';

export type IconButtonVariant = 'plain' | 'tonal';

export interface IconButtonProps {
  icon: IconName;
  /** Required: this is the only text a screen reader gets. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger';
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = 20,
  disabled = false,
  tone = 'default',
}: IconButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);

  const color = disabled
    ? theme.colors.textHint
    : tone === 'primary'
      ? theme.colors.primary
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.textSecondary;

  const background = variant === 'tonal'
    ? pressed
      ? theme.colors.borderSubtle
      : theme.colors.surfaceSunken
    : pressed
      ? theme.colors.surfaceSunken
      : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
