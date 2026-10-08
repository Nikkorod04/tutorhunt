/**
 * Section header.
 *
 * The uppercase micro eyebrow with letter-spacing is the single cheapest
 * detail that makes a screen look designed rather than assembled
 * (DESIGN_PLAN section 10, rule 6).
 */

import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  /** A trailing control, typically a ghost Button or an IconButton. */
  action?: ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space[12],
        marginBottom: theme.space[12],
      }}
    >
      <Text token="micro" color={theme.colors.textSecondary}>
        {title}
      </Text>
      {action}
    </View>
  );
}
