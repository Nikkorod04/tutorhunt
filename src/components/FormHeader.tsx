import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Card, IconButton, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

interface FormHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon: IconName;
  /** Uses a compact Android-style app bar instead of a raised intro card. */
  compact?: boolean;
  onBack?: () => void;
}

/** Consistent, compact introduction used by create/edit flows. */
export function FormHeader({ eyebrow, title, description, icon, compact = false, onBack }: FormHeaderProps) {
  const theme = useTheme();

  if (compact && onBack) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8], paddingVertical: theme.space[8] }}>
        <IconButton icon="arrow-back" variant="plain" tone="primary" accessibilityLabel="Go back" onPress={onBack} />
        <View style={{ flex: 1, gap: theme.space[2] }}>
          <Text token="h1">{title}</Text>
          {description ? <Text token="caption" color={theme.colors.textMuted}>{description}</Text> : null}
        </View>
      </View>
    );
  }

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
