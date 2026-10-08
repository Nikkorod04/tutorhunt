import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text, type IconName } from '@/components/ui';
import { useTheme, type Tone } from '@/theme';

export function RecordDetailHeader({
  eyebrow,
  title,
  subtitle,
  icon = 'document-text-outline',
  leading,
  status,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon?: IconName;
  leading?: ReactNode;
  status?: ReactNode;
  onBack: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[12] }}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8], alignSelf: 'flex-start', minHeight: theme.layout.minTouchTarget }}
      >
        <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
        <Text token="bodyStrong" color={theme.colors.primary}>Back</Text>
      </Pressable>

      <Card
        variant="raised"
        style={{
          backgroundColor: theme.colors.primarySubtle,
          borderColor: theme.colors.primaryBorder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
          {leading ?? (
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
          )}
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="micro" color={theme.colors.primary}>{eyebrow}</Text>
            <Text token="h1" numberOfLines={2}>{title}</Text>
            <Text token="caption" color={theme.colors.textSecondary}>{subtitle}</Text>
          </View>
          {status}
        </View>
      </Card>
    </View>
  );
}

export function RecordDetailRow({
  icon,
  label,
  value,
  tone = 'neutral',
  divider = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: Tone;
  divider?: boolean;
}) {
  const theme = useTheme();
  const toneSet = theme.tones[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[12],
        paddingVertical: theme.space[12],
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: theme.colors.borderSubtle,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.sm,
          backgroundColor: toneSet.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={19} color={toneSet.solid} />
      </View>
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <Text token="micro" color={theme.colors.textMuted}>{label}</Text>
        <Text token="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

export function RecordDetailMetrics({
  metrics,
}: {
  metrics: { label: string; value: string; tone?: Tone }[];
}) {
  const theme = useTheme();

  return (
    <Card variant="raised">
      <View style={{ flexDirection: 'row', gap: theme.space[16] }}>
        {metrics.map((metric) => (
          <View key={metric.label} style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="micro" color={theme.colors.textSecondary}>{metric.label}</Text>
            <Text token="h2" tabular color={metric.tone ? theme.tones[metric.tone].text : theme.colors.textPrimary}>
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function RecordDetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[8] }}>
      <Text token="micro" color={theme.colors.textSecondary}>{title}</Text>
      {children}
    </View>
  );
}
