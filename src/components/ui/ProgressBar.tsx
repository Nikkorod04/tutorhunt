/**
 * Progress bar.
 *
 * The `quota` variant escalates its tone as the limit approaches, so a Free
 * tutor sees the PDF allowance running out before it blocks them
 * (DESIGN_PLAN section 4.5).
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export interface ProgressBarProps {
  /** 0 to 1. Values outside the range are clamped. */
  value: number;
  variant?: 'determinate' | 'quota';
  /** Quota only: fraction at which the bar turns warning. */
  warnAt?: number;
  /** Quota only: fraction at which the bar turns danger. */
  dangerAt?: number;
}

export function ProgressBar({
  value,
  variant = 'determinate',
  warnAt = 0.6,
  dangerAt = 0.85,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  const progress = useSharedValue(theme.reduceMotion ? clamped : 0);

  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: theme.motion.duration.slow,
      easing: theme.motion.easing.standard,
    });
  }, [clamped, progress, theme.motion.duration.slow, theme.motion.easing.standard]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const color =
    variant === 'quota'
      ? clamped >= dangerAt
        ? theme.colors.danger
        : clamped >= warnAt
          ? theme.colors.warning
          : theme.colors.primary
      : theme.colors.primary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          fillStyle,
          { height: '100%', borderRadius: theme.radius.pill, backgroundColor: color },
        ]}
      />
    </View>
  );
}
