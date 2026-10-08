import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ExpenseForm } from '@/components/ExpenseForm';
import { Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { expenseErrorMessage, getExpense, updateExpense, type ExpenseInput } from '@/services/expenses.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Expense, Student } from '@/types';

export default function EditExpenseScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
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
    if (!profile || !id) return;
    setBusy(true);
    setError(null);
    try {
      await updateExpense(profile.uid, id, input);
      router.replace({ pathname: '/expense-detail', params: { id } } as never);
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!expense) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Expense not found" description="It may have been deleted, or the link is out of date." /></Screen>;

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Text token="h1">Edit expense</Text>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        <ExpenseForm students={students} initial={expense} submitLabel="Save changes" busy={busy} onSubmit={submit} />
      </View>
    </Screen>
  );
}
