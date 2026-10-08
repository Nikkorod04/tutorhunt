/**
 * Edit a student.
 *
 * Loads by the id in the route so the screen also works from a deep link,
 * rather than relying on the list screen having set a selected student.
 */

import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { StudentForm } from '@/components/StudentForm';
import { getStudent, studentErrorMessage, updateStudent, type StudentInput } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useTheme } from '@/theme';
import type { Student } from '@/types';

export default function EditStudentScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const upsert = useStudentStore((state) => state.upsert);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!profile || !id) {
        setLoading(false);
        return;
      }
      try {
        const found = await getStudent(profile.uid, id);
        if (active) setStudent(found);
      } catch {
        if (active) setError('Could not load this student.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [profile, id]);

  async function handleSubmit(input: StudentInput) {
    if (!profile || !id) return;

    setBusy(true);
    setError(null);
    try {
      const customAvatarUrl = await updateStudent(profile.uid, id, input);
      const { customAvatarLocalUri: _uri, customAvatarMimeType: _mime, ...persisted } = input;
      const updated = { ...persisted, customAvatarUrl };
      upsert({ ...updated, id, status: student?.status ?? 'active', createdAt: student?.createdAt ?? new Date(), updatedAt: new Date() });
      setStudent((current) => (current ? { ...current, ...updated } : current));
      setError(null);
    } catch (caught) {
      setError(studentErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}>
          <Skeleton width="40%" height={24} />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </View>
      </Screen>
    );
  }

  if (!student) {
    return (
      <Screen scroll>
        <EmptyState
          icon="alert-circle-outline"
          title="Student not found"
          description="It may have been removed, or the link is out of date."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Text token="h1">Edit {student.nickname}</Text>

        {error ? (
          <Card variant="flat">
            <Text token="caption" color={theme.colors.dangerText}>
              {error}
            </Text>
          </Card>
        ) : null}

        <StudentForm
          initial={student}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={handleSubmit}
        />
      </View>
    </Screen>
  );
}
