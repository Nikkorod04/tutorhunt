import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ExpenseForm } from '@/components/ExpenseForm';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { activePlanFor } from '@/constants/plans';
import { Card, Screen, Skeleton, Text, TopAppBar, useToast } from '@/components/ui';
import { createExpense, expenseErrorMessage, type ExpenseInput } from '@/services/expenses.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { showToastAfterNavigation } from '@/utils/feedback';
import type { Student } from '@/types';

export default function AddExpenseScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const preferredStudentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
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
    if (!profile || !beginSubmit()) return;
    setBusy(true);
    setError(null);
    let savedId: string | null = null;
    let leavingScreen = false;
    try {
      savedId = await createExpense(profile.uid, activePlanFor(entitlement), {
        ...input,
        studentId: input.studentId ?? preferredStudentId ?? null,
      });
      leavingScreen = Boolean(savedId);
    } catch (caught) {
      const message = expenseErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
      return;
    } finally {
      endSubmit();
      if (!leavingScreen) setBusy(false);
    }

    if (!savedId) return;
    router.replace({ pathname: '/expense-detail', params: { id: savedId } } as never);
    showToastAfterNavigation(showToast, 'Expense added successfully');
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;

  return (
    <Screen scroll header={<TopAppBar title="Add expense" onBack={() => router.back()} />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
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
