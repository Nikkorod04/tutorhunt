import React, { useState } from 'react';
import { View } from 'react-native';

import { AuthHeader } from '@/components/AuthHeader';
import { Button, Card, Screen, Text } from '@/components/ui';
import { APP_NAME } from '@/constants/branding';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { authErrorMessage, signInWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const accountError = useAuthStore((state) => state.error);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const displayedError = error ?? accountError;

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    let leavingScreen = false;

    try {
      await signInWithGoogle();
      // Auth bootstrap will replace this screen once the session is hydrated.
      // Keep the loading subtree stable while the native stack removes it.
      leavingScreen = true;
      // The auth layouts route from the hydrated auth state. Waiting for the
      // bootstrap avoids navigating before the user's profile and role load.
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      if (!leavingScreen) setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View
        style={{
          width: '100%',
          maxWidth: 520,
          alignSelf: 'center',
          gap: theme.space[24],
          paddingTop: theme.space[24],
        }}
      >
        <AuthHeader
          title="Welcome back"
          description="Sign in to manage your students, sessions and tutoring work."
          illustration={ILLUSTRATIONS.tutor}
        />

        <Card variant="raised" style={{ borderColor: theme.colors.primaryBorder }}>
          <View style={{ gap: theme.space[16] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="micro" color={theme.colors.textSecondary}>
                SIGN IN WITH GOOGLE
              </Text>
              <Text token="caption" color={theme.colors.textMuted}>
                Use your Google account to securely continue to {APP_NAME}.
              </Text>
            </View>

            {displayedError ? (
              <View
                style={{
                  backgroundColor: theme.colors.dangerSubtle,
                  borderColor: theme.colors.dangerBorder,
                  borderWidth: 0.5,
                  borderRadius: theme.radius.md,
                  padding: theme.space[12],
                }}
              >
                <Text token="caption" color={theme.colors.dangerText}>
                  {displayedError}
                </Text>
              </View>
            ) : null}

            <Button
              label="Continue with Google"
              icon="logo-google"
              onPress={handleSubmit}
              loading={busy}
              disabled={busy}
              size="lg"
              fullWidth
            />

            <Text token="caption" color={theme.colors.textMuted}>
              New users start with a tutor workspace after signing in.
            </Text>
          </View>
        </Card>

        <View
          style={{
            alignItems: 'center',
            gap: theme.space[8],
            paddingBottom: theme.space[8],
          }}
        >
          <Text token="micro" color={theme.colors.textHint}>
            Your account is secured by Google and Firebase Authentication.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
