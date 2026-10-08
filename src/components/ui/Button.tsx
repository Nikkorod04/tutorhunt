/**
 * Button.
 *
 * Five variants, three sizes, and the full state set: rest, pressed, disabled
 * and loading. Press feedback lands within 90ms (DESIGN_PLAN section 4.1).
 *
 * Two details worth keeping:
 * - While loading, the label stays in the tree at zero opacity so the button
 *   keeps its measured width and the layout never jumps.
 * - `sm` is only 36pt tall, so it carries hitSlop to reach the 44pt minimum
 *   touch target required by section 8.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme, type Theme } from '@/theme';
import type { IconName } from './icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
  testID?: string;
}

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; gap: number; icon: number }> = {
  sm: { height: 36, paddingHorizontal: 12, gap: 6, icon: 16 },
  md: { height: 48, paddingHorizontal: 16, gap: 8, icon: 20 },
  lg: { height: 56, paddingHorizontal: 20, gap: 8, icon: 22 },
};

/** Only these variants give haptic feedback; a ghost tap should stay silent. */
const HAPTIC_VARIANTS: readonly ButtonVariant[] = ['primary', 'accent', 'destructive'];

interface VariantColors {
  background: string;
  borderColor: string;
  borderWidth: number;
  label: string;
  spinner: string;
}

function variantColors(theme: Theme, variant: ButtonVariant, disabled: boolean, pressed: boolean): VariantColors {
  const c = theme.colors;

  switch (variant) {
    case 'primary':
      return {
        background: disabled ? c.primaryDisabled : pressed ? c.primaryPressed : c.primary,
        borderColor: 'transparent',
        borderWidth: 0,
        label: c.textOnPrimary,
        spinner: c.textOnPrimary,
      };
    case 'secondary':
      return {
        background: pressed && !disabled ? c.surfaceSunken : c.surface,
        borderColor: disabled ? c.borderSubtle : pressed ? c.borderStrong : c.borderDefault,
        borderWidth: 0.5,
        label: disabled ? c.textHint : c.textPrimary,
        spinner: c.textPrimary,
      };
    case 'ghost':
      return {
        background: pressed && !disabled ? c.primarySubtle : 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        label: disabled ? c.textHint : c.primary,
        spinner: c.primary,
      };
    case 'accent':
      return {
        background: disabled ? c.accentDisabled : pressed ? c.accentPressed : c.accent,
        borderColor: 'transparent',
        borderWidth: 0,
        label: c.textOnAccent,
        spinner: c.textOnAccent,
      };
    case 'destructive':
      return {
        background: disabled ? c.dangerDisabled : pressed ? c.dangerPressed : c.danger,
        borderColor: 'transparent',
        borderWidth: 0,
        label: c.textOnPrimary,
        spinner: c.textOnPrimary,
      };
  }
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'leading',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const inert = disabled || loading;
  const sizeSpec = SIZES[size];
  const colors = variantColors(theme, variant, disabled, pressed);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle =
    size === 'sm'
      ? { ...theme.typography.caption, fontFamily: theme.fontFamily.semibold, fontWeight: '600' as const }
      : size === 'lg'
        ? theme.typography.h3
        : theme.typography.bodyStrong;

  const glyph = icon ? (
    <Ionicons name={icon} size={sizeSpec.icon} color={colors.label} />
  ) : null;

  return (
    <Animated.View style={[fullWidth ? styles.stretch : styles.selfStart, animatedStyle]}>
      <Pressable
        onPress={onPress}
        disabled={inert}
        onPressIn={() => {
          if (inert) return;
          setPressed(true);
          if (!theme.reduceMotion) {
            scale.value = withTiming(theme.motion.transform.pressScaleButton, {
              duration: theme.motion.duration.instant,
              easing: theme.motion.easing.standard,
            });
          }
          if (HAPTIC_VARIANTS.includes(variant)) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        onPressOut={() => {
          setPressed(false);
          if (!theme.reduceMotion) {
            scale.value = withTiming(1, {
              duration: theme.motion.duration.fast,
              easing: theme.motion.easing.standard,
            });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: inert, busy: loading }}
        testID={testID}
        hitSlop={size === 'sm' ? { top: 4, bottom: 4, left: 0, right: 0 } : undefined}
        style={{
          height: sizeSpec.height,
          paddingHorizontal: sizeSpec.paddingHorizontal,
          borderRadius: theme.radius.md,
          borderWidth: colors.borderWidth,
          borderColor: colors.borderColor,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={[styles.row, { gap: sizeSpec.gap, opacity: loading ? 0 : 1 }]}>
          {iconPosition === 'leading' ? glyph : null}
          <Text style={labelStyle} color={colors.label}>
            {label}
          </Text>
          {iconPosition === 'trailing' ? glyph : null}
        </View>

        {loading ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.spinner} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretch: { alignSelf: 'stretch' },
  selfStart: { alignSelf: 'flex-start' },
});
