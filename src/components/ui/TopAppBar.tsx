import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface TopAppBarProps {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}

/** Compact native-style toolbar shared by authenticated app screens. */
export function TopAppBar({ title, onBack, action }: TopAppBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        minHeight: 56 + insets.top,
        paddingHorizontal: theme.layout.screenPadding,
        paddingTop: insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[8],
        backgroundColor: theme.colors.primary,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.primaryPressed,
        marginTop: -insets.top,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
        </Pressable>
      ) : null}
      <Text token="h1" color={theme.colors.textOnPrimary} style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
      {action ? <View>{action}</View> : null}
    </View>
  );
}
