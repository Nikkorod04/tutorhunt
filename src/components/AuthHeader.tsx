import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';

import { APP_ICON, APP_NAME } from '@/constants/branding';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

interface AuthHeaderProps {
  title: string;
  description: string;
  illustration: ImageSourcePropType;
}

export function AuthHeader({ title, description, illustration }: AuthHeaderProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[20] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primarySubtle,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Image
            source={APP_ICON}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
            accessibilityLabel={`${APP_NAME} logo`}
            accessibilityIgnoresInvertColors
          />
        </View>
        <View>
          <Text token="h3">{APP_NAME}</Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space[16],
          padding: theme.space[16],
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.primarySubtle,
          borderColor: theme.colors.primaryBorder,
          borderWidth: 0.5,
          ...theme.elevation.e1,
        }}
      >
        <View style={{ flex: 1, gap: theme.space[8] }}>
          <Text token="micro" color={theme.colors.primary}>{APP_NAME.toUpperCase()}</Text>
          <Text token="h1">{title}</Text>
          <Text token="caption" color={theme.colors.textSecondary}>{description}</Text>
        </View>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image source={illustration} style={{ width: 80, height: 80 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      </View>
    </View>
  );
}
