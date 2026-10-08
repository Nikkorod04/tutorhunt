/**
 * Root layout.
 *
 * Provider order matters: GestureHandlerRootView must be outermost for the
 * bottom sheet and swipe gestures, SafeAreaProvider next for the insets that
 * Screen consumes, then ThemeProvider, which blocks rendering until Inter has
 * loaded so no component ever needs a font fallback.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme';

function RootNavigator() {
  useAuthBootstrap();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="setup" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
