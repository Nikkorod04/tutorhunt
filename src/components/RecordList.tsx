import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Card, Text, type IconName } from '@/components/ui';
import { useTheme, type Tone } from '@/theme';

interface RecordListSummaryProps {
  icon: IconName;
  label: string;
  value: string;
  description: string;
  aside?: ReactNode;
}

export function RecordListSummary({
  icon,
  label,
  value,
  description,
  aside,
}: RecordListSummaryProps) {
  const theme = useTheme();

  return (
    <Card
      variant="raised"
      style={{
        backgroundColor: theme.colors.primarySubtle,
        borderColor: theme.colors.primaryBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: theme.space[2] }}>
          <Text token="micro" color={theme.colors.primary}>{label}</Text>
          <Text token="h2" tabular>{value}</Text>
          <Text token="caption" color={theme.colors.textSecondary}>{description}</Text>
        </View>
        {aside}
      </View>
    </Card>
  );
}

interface RecordListCardProps {
  icon: IconName;
  iconTone?: Tone;
  leading?: ReactNode;
  title: string;
  subtitle: string;
  amount?: string;
  status?: ReactNode;
  tags?: ReactNode;
  actionLabel: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function RecordListCard({
  icon,
  iconTone = 'info',
  leading,
  title,
  subtitle,
  amount,
  status,
  tags,
  actionLabel,
  onPress,
  accessibilityLabel,
}: RecordListCardProps) {
  const theme = useTheme();
  const tone = theme.tones[iconTone];

  return (
    <Card variant="interactive" onPress={onPress} accessibilityLabel={accessibilityLabel ?? `${actionLabel}: ${title}`}>
      <View style={{ gap: theme.space[12] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
          {leading ?? (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.radius.md,
                backgroundColor: tone.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={icon} size={22} color={tone.solid} />
            </View>
          )}
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="h3" numberOfLines={2}>{title}</Text>
            <Text token="caption" color={theme.colors.textMuted} numberOfLines={2}>{subtitle}</Text>
          </View>
          {status}
        </View>

        {tags ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{tags}</View> : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.space[12],
            paddingTop: theme.space[12],
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.borderSubtle,
          }}
        >
          {amount ? <Text token="bodyStrong" tabular>{amount}</Text> : <View />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
            <Text token="bodyStrong" color={theme.colors.primary}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </View>
        </View>
      </View>
    </Card>
  );
}
