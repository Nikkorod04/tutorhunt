/**
 * Placeholder for screens that belong to a later phase.
 *
 * Deliberately built with the real design system rather than a bare label, so
 * the navigation and the visual language can be reviewed before the feature
 * behind it exists.
 */

import React from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme';

export interface ComingSoonProps {
  title: string;
  icon: IconName;
  phase: string;
  description: string;
}

export function ComingSoon({ title, icon, phase, description }: ComingSoonProps) {
  const theme = useTheme();

  return (
    <Screen scroll padded>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <Text token="h1">{title}</Text>

        <EmptyState icon={icon} title="Not built yet" description={description} />

        <Card variant="flat">
          <Text token="caption" color={theme.colors.textMuted}>
            Scheduled for {phase} of the build plan.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
