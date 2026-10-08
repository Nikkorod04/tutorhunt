/**
 * Role selection.
 *
 * This is where users/{uid} is actually created. The document cannot be
 * written at signup and patched later, because the security rules make `role`
 * immutable on update — so the role is chosen once, here, and written once.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, View, type ImageSourcePropType } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { authErrorMessage, completeProfile } from '@/services/auth.service';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import type { Role } from '@/types';

interface Option {
  role: Exclude<Role, 'admin'>;
  image: ImageSourcePropType;
  title: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    role: 'tutor',
    image: ILLUSTRATIONS.tutor,
    title: 'I am a tutor',
    description: 'Track students, sessions, expenses and statements.',
  },
  {
    role: 'parent',
    image: ILLUSTRATIONS.parent,
    title: 'I am a parent',
    description: 'Find tutors and post tutoring requests.',
  },
];

export default function RoleSelectionScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<Option['role'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    if (!selected || busy) return;

    const user = getFirebaseAuth().currentUser;
    if (!user) {
      setError('Your session expired. Please sign in again.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await completeProfile({
        uid: user.uid,
        role: selected,
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Tutor Hunt user',
        email: user.email ?? '',
      });

      // Re-run the bootstrap so the store picks up the new profile.
      const { setNeedsRole } = useAuthStore.getState();
      setNeedsRole(user.uid);

      router.replace('/');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space[24], paddingTop: theme.space[48] }}>
        <View style={{ alignItems: 'center', gap: theme.space[12] }}>
          <Image
            source={ILLUSTRATIONS.tutoring}
            style={{ width: 176, height: 176 }}
            resizeMode="contain"
            accessibilityLabel="Tutoring illustration"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={{ gap: theme.space[4] }}>
          <Text token="h1">How will you use Tutor Hunt?</Text>
          <Text token="body" color={theme.colors.textMuted}>
            This shapes your home screen. It cannot be changed later.
          </Text>
        </View>

        <View style={{ gap: theme.space[12] }}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option.role;

            return (
              <Pressable
                key={option.role}
                onPress={() => setSelected(option.role)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space[16],
                  padding: theme.space[16],
                  borderRadius: theme.radius.lg,
                  borderWidth: isSelected ? 2 : 0.5,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.borderSubtle,
                  backgroundColor: isSelected ? theme.colors.primarySubtle : theme.colors.surface,
                  ...theme.elevation.e1,
                }}
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.surfaceSunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    source={option.image}
                    style={{ width: 80, height: 80 }}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text token="h3">{option.title}</Text>
                  <Text token="caption" color={theme.colors.textMuted}>
                    {option.description}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Text token="caption" color={theme.colors.danger}>
            {error}
          </Text>
        ) : null}

        <Button
          label="Continue"
          onPress={handleContinue}
          loading={busy}
          disabled={!selected}
          fullWidth
        />
      </View>
    </Screen>
  );
}
