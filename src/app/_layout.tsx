/**
 * Root layout.
 *
 * Provider order matters: GestureHandlerRootView must be outermost for the
 * bottom sheet and swipe gestures, SafeAreaProvider next for the insets that
 * Screen consumes, then ThemeProvider, which blocks rendering until Inter has
 * loaded so no component ever needs a font fallback.
 */

import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { useNotificationBootstrap } from '@/hooks/useNotificationBootstrap';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

function RootNavigator() {
  useAuthBootstrap();
  useNotificationBootstrap();
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'signedIn';

  return (
    <>
      <StatusBar
        barStyle={isAuthenticated ? 'light-content' : 'dark-content'}
        backgroundColor={isAuthenticated ? theme.colors.primaryPressed : theme.colors.canvas}
        translucent={false}
      />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
