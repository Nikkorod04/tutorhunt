/**
 * Full-screen loading state used while the persisted session is restored.
 */

import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';

export function AppLoading() {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.canvas,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
