/**
 * Auth route group.
 *
 * Redirects away as soon as the user has a profile, so the auth screens are
 * never reachable once signed in. This is the mirror of the guard in (app).
 */

import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { AppLoading } from '@/components/AppLoading';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <AppLoading />;
  if (status === 'unconfigured') return <Redirect href="/setup" />;
  if (status === 'signedIn') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
        animation: 'slide_from_right',
      }}
    />
  );
}
