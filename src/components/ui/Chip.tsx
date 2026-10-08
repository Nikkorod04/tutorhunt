/**
 * Chip.
 *
 * Three jobs: a selectable filter, a status badge, and a removable token.
 * Selection is signalled by fill AND a check glyph, never by colour alone
 * (DESIGN_PLAN section 4.3).
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, type Tone } from '@/theme';
import type { IconName } from './icon';
import { Text } from './Text';

export type ChipVariant = 'filter' | 'status' | 'removable';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  /** For `status`: the semantic tone. */
  tone?: Tone;
  /** Ionicons glyph name, shown before the label. */
  icon?: IconName;
  /** For `filter`: whether the chip is selected. */
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  variant = 'filter',
  tone = 'neutral',
  icon,
  selected = false,
  onPress,
  onRemove,
  accessibilityLabel,
}: ChipProps) {
  const theme = useTheme();
  const check = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const target = selected ? 1 : 0;
    check.value = theme.reduceMotion
      ? withTiming(target, { duration: theme.motion.duration.fast })
      : withSpring(target, theme.motion.spring);
  }, [selected, check, theme.reduceMotion, theme.motion.duration.fast, theme.motion.spring]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: check.value }],
  }));

  const isFilter = variant === 'filter';
  const toneSet = theme.tones[tone];

  const background = isFilter
    ? selected
      ? theme.colors.primary
      : theme.colors.surface
    : toneSet.subtle;
  const borderColor = isFilter
    ? selected
      ? theme.colors.primary
      : theme.colors.borderDefault
    : toneSet.border;
  const labelColor = isFilter
    ? selected
      ? theme.colors.textOnPrimary
      : theme.colors.textSecondary
    : toneSet.text;
  const glyphColor = isFilter ? labelColor : toneSet.solid;

  const content = (
    <View style={[styles.inner, { backgroundColor: background, borderColor }]}>
      {isFilter && selected ? (
        <Animated.View style={checkStyle}>
          <Ionicons name="checkmark" size={12} color={labelColor} />
        </Animated.View>
      ) : null}

      {!isFilter && icon ? <Ionicons name={icon} size={12} color={glyphColor} /> : null}

      {isFilter && !selected && icon ? (
        <Ionicons name={icon} size={12} color={glyphColor} />
      ) : null}

      <Text token="caption" color={labelColor}>
        {label}
      </Text>

      {variant === 'removable' ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Ionicons name="close" size={14} color={glyphColor} />
        </Pressable>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 0.5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
});
