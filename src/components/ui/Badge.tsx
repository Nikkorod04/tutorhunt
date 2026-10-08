/**
 * Badge: a small count, a plan marker, or a presence dot.
 *
 * The plan badge uses the premium tone so "Pro" reads as a reward rather than
 * an error (DESIGN_PLAN section 3.1.3).
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, type Tone } from '@/theme';
import { Text } from './Text';

export type BadgeVariant = 'count' | 'plan' | 'dot';

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  tone?: Tone;
  /** For `dot`: renders a small presence indicator. */
  color?: string;
}

export function Badge({ variant = 'count', label, tone = 'premium', color }: BadgeProps) {
  const theme = useTheme();

  if (variant === 'dot') {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: color ?? theme.colors.success, borderColor: theme.colors.surface },
        ]}
      />
    );
  }

  const toneSet = theme.tones[tone];
  const isPro = variant === 'plan' && label?.toLowerCase() === 'pro';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: toneSet.subtle,
          borderColor: toneSet.border,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      {isPro ? <Ionicons name="star" size={10} color={toneSet.text} /> : null}
      <Text token="micro" color={toneSet.text}>
        {label ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
  },
});
