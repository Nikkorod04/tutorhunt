import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ExpenseForm } from '@/components/ExpenseForm';
import { Card, Screen, Skeleton, Text } from '@/components/ui';
import { createExpense, expenseErrorMessage, type ExpenseInput } from '@/services/expenses.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Student } from '@/types';

export default function AddExpenseScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const preferredStudentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const profile = useAuthStore((state) => state.profile);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const page = await listStudents(profile.uid, { status: 'active', pageSize: 50 });
        setStudents(page.items);
      } catch (caught) {
        setError(expenseErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile]);

  async function submit(input: ExpenseInput) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createExpense(profile.uid, {
        ...input,
        studentId: input.studentId ?? preferredStudentId ?? null,
      });
      router.replace({ pathname: '/expense-detail', params: { id } } as never);
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Text token="h1">Add expense</Text>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        <ExpenseForm
          students={students}
          preferredStudentId={preferredStudentId}
          submitLabel="Save expense"
          busy={busy}
          onSubmit={submit}
        />
      </View>
    </Screen>
  );
}
