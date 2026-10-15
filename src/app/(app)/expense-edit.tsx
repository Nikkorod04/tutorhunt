import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ExpenseForm } from '@/components/ExpenseForm';
import { Card, EmptyState, Screen, Skeleton, Text, TopAppBar, useToast } from '@/components/ui';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { activePlanFor } from '@/constants/plans';
import { expenseErrorMessage, getExpense, updateExpense, type ExpenseInput } from '@/services/expenses.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { showToastAfterNavigation } from '@/utils/feedback';
import type { Expense, Student } from '@/types';

export default function EditExpenseScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile || !id) {
        setLoading(false);
        return;
      }
      try {
        const [found, page] = await Promise.all([
          getExpense(profile.uid, id),
          listStudents(profile.uid, { pageSize: 50 }),
        ]);
        setExpense(found);
        setStudents(page.items);
      } catch (caught) {
        setError(expenseErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile, id]);

  async function submit(input: ExpenseInput) {
    if (!profile || !id || !beginSubmit()) return;
    setBusy(true);
    setError(null);
    let leavingScreen = false;
    try {
      await updateExpense(profile.uid, id, activePlanFor(entitlement), input);
      leavingScreen = true;
    } catch (caught) {
      const message = expenseErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
      return;
    } finally {
      endSubmit();
      if (!leavingScreen) setBusy(false);
    }

    router.replace({ pathname: '/expense-detail', params: { id } } as never);
    showToastAfterNavigation(showToast, 'Expense updated successfully');
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!expense) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Expense not found" description="It may have been deleted, or the link is out of date." /></Screen>;

  return (
    <Screen scroll header={<TopAppBar title="Edit expense" onBack={() => router.back()} />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        <ExpenseForm
          students={students}
          initial={expense}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={submit}
        />
      </View>
    </Screen>
  );
}
