import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Image, View } from 'react-native';

import { AppLoading } from '@/components/AppLoading';
import { Avatar, Button, Card, Screen, Text } from '@/components/ui';
import { APP_NAME } from '@/constants/branding';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import {
  authErrorMessage,
  completeProfile,
  fetchEntitlement,
  fetchUserProfile,
} from '@/services/auth.service';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function TutorOnboardingScreen() {
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);
  const signedInUser = getFirebaseAuth().currentUser;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'loading') return <AppLoading />;
  if (status !== 'needsProfile') {
    return <Redirect href={status === 'signedIn' ? '/' : '/login'} />;
  }

  async function handleContinue() {
    if (busy) return;

    const user = getFirebaseAuth().currentUser;
    if (!user) {
      setError('Your session expired. Please sign in again.');
      return;
    }

    setBusy(true);
    setError(null);
    let leavingScreen = false;

    try {
      await completeProfile({
        uid: user.uid,
        displayName: user.displayName ?? user.email?.split('@')[0] ?? `${APP_NAME} user`,
        email: user.email ?? '',
        photoUrl: user.photoURL ?? null,
      });

      const [profile, entitlement] = await Promise.all([
        fetchUserProfile(user.uid),
        fetchEntitlement(user.uid),
      ]);
      if (!profile) {
        throw new Error('Your account was created, but the profile could not be loaded. Please try again.');
      }

      useAuthStore.getState().setSession(user.uid, profile, entitlement);
      leavingScreen = true;
      router.replace('/' as never);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      if (!leavingScreen) setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space[24], paddingTop: theme.space[48] }}>
        <View style={{ alignItems: 'center', gap: theme.space[12] }}>
          <Image
            source={ILLUSTRATIONS.tutor}
            style={{ width: 176, height: 176 }}
            resizeMode="contain"
            accessibilityLabel="Tutor illustration"
            accessibilityIgnoresInvertColors
          />
          <Card variant="flat" style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
              <Avatar name={signedInUser?.displayName ?? ''} imageUrl={signedInUser?.photoURL} size="md" />
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="bodyStrong">Welcome, {signedInUser?.displayName ?? `${APP_NAME} user`}</Text>
                <Text token="caption" color={theme.colors.textMuted}>{signedInUser?.email ?? ''}</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: theme.space[8] }}>
          <Text token="micro" color={theme.colors.primary}>{APP_NAME.toUpperCase()}</Text>
          <Text token="h1">Your tutor workspace is ready</Text>
          <Text token="body" color={theme.colors.textMuted}>
            Manage students, sessions, expenses, payments and professional statements in one place.
          </Text>
        </View>

        <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <Text token="h3">Your workspace is ready</Text>
            <Text token="body" color={theme.colors.textMuted}>
              Start by adding your students, then record sessions and expenses as you work.
            </Text>
          </View>
        </Card>

        {error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : null}

        <Button
          label="Continue to my workspace"
          onPress={handleContinue}
          loading={busy}
          disabled={busy}
          fullWidth
        />
      </View>
    </Screen>
  );
}
