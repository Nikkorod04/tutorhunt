/**
 * Shown when the app has no Firebase configuration.
 *
 * Without this the first launch would throw from the Firebase bootstrap with
 * nothing on screen, which is a miserable first experience. The project is
 * deliberately runnable before a Firebase project exists.
 */

import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { isFirebaseConfigured } from '@/services/firebase';
import { useTheme } from '@/theme';

const STEPS = [
  'Create a project at console.firebase.google.com',
  'Enable Email/Password under Authentication',
  'Create a Cloud Firestore database',
  'Copy .env.example to .env and paste your web app config',
  'Restart with: npx expo start --clear',
];

export default function SetupScreen() {
  const theme = useTheme();

  // Native navigation can restore the last route after Expo Go restarts. If
  // that route was /setup from before Firebase was configured, do not leave
  // the user stranded on a now-obsolete setup screen.
  if (isFirebaseConfigured) return <Redirect href="/login" />;

  return (
    <Screen scroll padded>
      <View style={{ paddingTop: theme.space[48], gap: theme.space[24] }}>
        <View style={{ alignItems: 'center', gap: theme.space[12] }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.accentSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="flame-outline" size={32} color={theme.colors.accent} />
          </View>

          <Text token="h1" align="center">
            Connect Firebase
          </Text>
          <Text token="body" color={theme.colors.textMuted} align="center">
            Tutor Hunt needs a Firebase project before it can sign anyone in.
          </Text>
        </View>

        <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            {STEPS.map((step, index) => (
              <View
                key={step}
                style={{ flexDirection: 'row', gap: theme.space[12], alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text token="micro" color={theme.colors.primary}>
                    {String(index + 1)}
                  </Text>
                </View>
                <Text token="caption" style={{ flex: 1 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="accent">
          <Text token="caption" color={theme.colors.warningText}>
            Security rules and indexes are already written. Deploy them with
            firebase deploy --only firestore once your project id is set in
            .firebaserc.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
