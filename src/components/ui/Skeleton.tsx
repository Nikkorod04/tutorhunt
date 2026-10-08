/**
 * Skeleton loading placeholder.
 *
 * A gentle opacity pulse, not a sweeping shimmer: the sweep is one of the
 * banned motion patterns (DESIGN_PLAN section 6).
 */

import React, { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export type SkeletonVariant = 'line' | 'card' | 'list';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  /** `list` only: how many rows to draw. */
  rows?: number;
}

export function Skeleton({ variant = 'line', width = '100%', height, rows = 3 }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (theme.reduceMotion) {
      pulse.value = 0.6;
      return;
    }
    pulse.value = withRepeat(withTiming(0.5, { duration: 1200 }), -1, true);
  }, [pulse, theme.reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const bar = (h: number, w: DimensionValue, key?: number) => (
    <Animated.View
      key={key}
      style={[
        pulseStyle,
        {
          width: w,
          height: h,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceSunken,
        },
      ]}
    />
  );

  if (variant === 'card') {
    return (
      <Animated.View
        style={[
          pulseStyle,
          {
            height: height ?? 96,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceSunken,
          },
        ]}
      />
    );
  }

  if (variant === 'list') {
    return (
      <View style={{ gap: theme.space[12] }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <Animated.View
              style={[
                pulseStyle,
                {
                  width: 44,
                  height: 44,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.surfaceSunken,
                },
              ]}
            />
            <View style={{ flex: 1, gap: theme.space[8] }}>
              {bar(14, '70%')}
              {bar(12, '45%')}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return bar(height ?? 14, width);
}
