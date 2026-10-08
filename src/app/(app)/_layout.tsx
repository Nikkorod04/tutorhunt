/**
 * Authenticated navigation.
 *
 * The tabs live inside a stack so detail and form routes are pushed above the
 * tab navigator. This preserves normal Back behavior instead of treating
 * every hidden detail route as another tab destination.
 */

import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { AppLoading } from '@/components/AppLoading';
import { useAuthStore } from '@/stores/authStore';

export default function AppLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <AppLoading />;
  if (status === 'unconfigured') return <Redirect href="/setup" />;
  if (status === 'signedOut') return <Redirect href="/login" />;
  if (status === 'needsRole') return <Redirect href="/role-selection" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="student-new" />
      <Stack.Screen name="student-detail" />
      <Stack.Screen name="student-edit" />
      <Stack.Screen name="session-new" />
      <Stack.Screen name="session-detail" />
      <Stack.Screen name="session-edit" />
      <Stack.Screen name="recurring" />
      <Stack.Screen name="recurring-new" />
      <Stack.Screen name="recurring-detail" />
      <Stack.Screen name="recurring-edit" />
      <Stack.Screen name="parent-request-new" />
      <Stack.Screen name="parent-request-detail" />
      <Stack.Screen name="parent-request-edit" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="expense-new" />
      <Stack.Screen name="expense-detail" />
      <Stack.Screen name="expense-edit" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="payment-new" />
      <Stack.Screen name="payment-detail" />
      <Stack.Screen name="payment-edit" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="statements" />
      <Stack.Screen name="statement-new" />
      <Stack.Screen name="statement-detail" />
      <Stack.Screen name="tutor-profile" />
      <Stack.Screen name="tutor-profile-edit" />
      <Stack.Screen name="parent-profile-edit" />
      <Stack.Screen name="upgrade" />
    </Stack>
  );
}
