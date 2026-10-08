/**
 * Avatar.
 *
 * Students use a built-in avatar so no photo of a child is uploaded unless the
 * tutor explicitly chooses a custom one (blueprint sections 7.8 and 52).
 * A ring marks a verified tutor.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ILLUSTRATIONS } from '@/constants/illustrations';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Used for the initials fallback. */
  name?: string;
  imageUrl?: string | null;
  /** Built-in student avatar illustration. */
  builtin?: 'boy' | 'girl' | 'neutral';
  size?: AvatarSize;
  /** Draws a primary ring, used for a verified tutor. */
  ringed?: boolean;
}

const DIMENSIONS: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64 };

function initialsFor(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  imageUrl,
  builtin,
  size = 'md',
  ringed = false,
}: AvatarProps) {
  const theme = useTheme();
  const dimension = DIMENSIONS[size];

  const ring = ringed
    ? { borderWidth: 2, borderColor: theme.colors.primaryBorder }
    : { borderWidth: 0.5, borderColor: theme.colors.borderSubtle };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          { width: dimension, height: dimension, borderRadius: 999 },
          ring,
        ]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (builtin) {
    return (
      <Image
        source={ILLUSTRATIONS[builtin]}
        style={[{ width: dimension, height: dimension, borderRadius: 999 }, ring]}
        resizeMode="contain"
        accessibilityLabel={`${builtin} student avatar`}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          backgroundColor: theme.colors.primarySubtle,
        },
        ring,
      ]}
    >
      <Text
        token={size === 'lg' ? 'h3' : 'caption'}
        color={theme.colors.primary}
      >
        {initialsFor(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
