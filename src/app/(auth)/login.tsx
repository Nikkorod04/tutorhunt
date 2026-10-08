import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components/ui';
import { authErrorMessage, signIn } from '@/services/auth.service';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      // The root navigator reacts to the auth store and routes on from here.
      router.replace('/');
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
        <View style={{ gap: theme.space[24], paddingTop: theme.space[48] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="h1">Welcome back</Text>
            <Text token="body" color={theme.colors.textMuted}>
              Sign in to manage your students and sessions.
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
                returnKeyType="next"
              />

              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                icon="lock-closed-outline"
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
                label="Sign in"
                onPress={handleSubmit}
                loading={busy}
                disabled={!canSubmit}
                fullWidth
              />

              <Button
                label="Forgot your password?"
                variant="ghost"
                size="sm"
                onPress={() => router.push('/forgot-password')}
              />
            </View>
          </Card>

          <View style={{ alignItems: 'center', gap: theme.space[4] }}>
            <Text token="caption" color={theme.colors.textMuted}>
              New to Tutor Hunt?
            </Text>
            <Button
              label="Create an account"
              variant="secondary"
              onPress={() => router.push('/register')}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
