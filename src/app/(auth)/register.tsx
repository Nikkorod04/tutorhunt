import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { authErrorMessage, register } from '@/services/auth.service';
import { useTheme } from '@/theme';

const MIN_PASSWORD_LENGTH = 6;
const MAX_DISPLAY_NAME = 60;

export default function RegisterScreen() {
  const theme = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirm &&
    !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await register({ email, password, displayName });
      // Signed in, but users/{uid} does not exist yet, so the role is next.
      router.replace('/role-selection');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ gap: theme.space[24], paddingTop: theme.space[32] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="h1">Create your account</Text>
            <Text token="body" color={theme.colors.textMuted}>
              Takes a moment. You will choose whether you are a tutor or a parent next.
            </Text>
          </View>

          <Card variant="raised">
            <View style={{ gap: theme.space[16] }}>
              <TextField
                label="Your name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Juan Dela Cruz"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                icon="person-outline"
                maxLength={MAX_DISPLAY_NAME}
                returnKeyType="next"
              />

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
                returnKeyType="next"
              />

              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                helper={`Minimum ${MIN_PASSWORD_LENGTH} characters.`}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                icon="lock-closed-outline"
                returnKeyType="next"
              />

              <TextField
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Type it again"
                secureTextEntry
                autoCapitalize="none"
                icon="lock-closed-outline"
                error={passwordMismatch ? 'Passwords do not match.' : null}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />

              {error ? (
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
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                label="Create account"
                onPress={handleSubmit}
                loading={busy}
                disabled={!canSubmit}
                fullWidth
              />
            </View>
          </Card>

          <View style={{ alignItems: 'center', gap: theme.space[4] }}>
            <Text token="caption" color={theme.colors.textMuted}>
              Already have an account?
            </Text>
            <Button label="Sign in" variant="ghost" onPress={() => router.replace('/login')} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
