/**
 * Empty state.
 *
 * Never a bare sentence: a tinted glyph, a headline, an explanation and one
 * action (DESIGN_PLAN sections 7 and 10, rule 9).
 */

import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import type { IconName } from './icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  /** Usually a Button. */
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.space[48],
        gap: theme.space[12],
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primarySubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={32} color={theme.colors.primary} />
      </View>

      <Text token="h3" align="center">
        {title}
      </Text>

      {description ? (
        <Text token="caption" color={theme.colors.textMuted} align="center">
          {description}
        </Text>
      ) : null}

      {action ? <View style={{ marginTop: theme.space[8] }}>{action}</View> : null}
    </View>
  );
}
