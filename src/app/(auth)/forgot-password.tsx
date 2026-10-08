import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { authErrorMessage, sendPasswordReset } from '@/services/auth.service';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen scroll>
        <View style={{ gap: theme.space[24], paddingTop: theme.space[64] }}>
          <View style={{ alignItems: 'center', gap: theme.space[12] }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.successSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-open-outline" size={32} color={theme.colors.success} />
            </View>
            <Text token="h1" align="center">
              Check your email
            </Text>
            <Text token="body" color={theme.colors.textMuted} align="center">
              If {email.trim()} has an account, a reset link is on its way.
            </Text>
          </View>

          <Button label="Back to sign in" onPress={() => router.replace('/login')} fullWidth />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space[24], paddingTop: theme.space[32] }}>
        <View style={{ gap: theme.space[4] }}>
          <Text token="h1">Reset your password</Text>
          <Text token="body" color={theme.colors.textMuted}>
            We will email you a link to choose a new one.
          </Text>
        </View>

        <Card variant="raised">
          <View style={{ gap: theme.space[16] }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              icon="mail-outline"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error ? (
              <Text token="caption" color={theme.colors.danger}>
                {error}
              </Text>
            ) : null}

            <Button
              label="Send reset link"
              onPress={handleSubmit}
              loading={busy}
              disabled={!canSubmit}
              fullWidth
            />
          </View>
        </Card>

        <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
