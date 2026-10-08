/**
 * Add a student.
 *
 * The free-plan cap is enforced in the service, not here — this screen only
 * surfaces the resulting error, and offers the upgrade path.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { StudentForm } from '@/components/StudentForm';
import {
  createStudent,
  studentErrorMessage,
  StudentLimitError,
  type StudentInput,
} from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useTheme } from '@/theme';

export default function AddStudentScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const upsert = useStudentStore((state) => state.upsert);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  async function handleSubmit(input: StudentInput) {
    if (!profile) return;

    setBusy(true);
    setError(null);
    setLimitHit(false);

    try {
      const created = await createStudent(profile.uid, entitlement?.plan ?? 'free', input);
      const { customAvatarLocalUri: _uri, customAvatarMimeType: _mime, ...persisted } = input;
      upsert({ ...persisted, id: created.id, customAvatarUrl: created.customAvatarUrl, status: 'active', createdAt: new Date(), updatedAt: new Date() });
      router.back();
    } catch (caught) {
      setError(studentErrorMessage(caught));
      setLimitHit(caught instanceof StudentLimitError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Text token="h1">Add student</Text>

        {error ? (
          <Card variant={limitHit ? 'premium' : 'flat'}>
            <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
              <Ionicons
                name={limitHit ? 'star' : 'alert-circle-outline'}
                size={20}
                color={limitHit ? theme.colors.premium : theme.colors.danger}
              />
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text
                  token="caption"
                  color={limitHit ? theme.colors.premiumText : theme.colors.dangerText}
                >
                  {error}
                </Text>
                {limitHit ? (
                  <Text token="caption" color={theme.colors.textMuted}>
                    Upgrade to Pro for unlimited students. Nothing you have already recorded is
                    ever deleted.
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        ) : null}

        <StudentForm submitLabel="Save student" busy={busy} onSubmit={handleSubmit} />
      </View>
    </Screen>
  );
}
