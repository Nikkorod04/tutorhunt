import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Card, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

interface FormHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
}

/** Consistent, compact introduction used by create/edit flows. */
export function FormHeader({ eyebrow, title, description, icon }: FormHeaderProps) {
  const theme = useTheme();

  return (
    <Card
      variant="raised"
      style={{
        backgroundColor: theme.colors.primarySubtle,
        borderColor: theme.colors.primaryBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: theme.space[4] }}>
          <Text token="micro" color={theme.colors.primary}>{eyebrow}</Text>
          <Text token="h1">{title}</Text>
          <Text token="caption" color={theme.colors.textSecondary}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}
