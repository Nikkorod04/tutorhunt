import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ListRow,
  ReimbursementStatusChip,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { expenseCategoryLabel } from '@/constants/expenses';
import {
  deleteExpense,
  expenseErrorMessage,
  getExpense,
  updateReimbursementStatus,
} from '@/services/expenses.service';
import { getStudent } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Expense, Student } from '@/types';
import { expenseTotal } from '@/utils/pricing';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

export default function ExpenseDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }
    try {
      const found = await getExpense(profile.uid, id);
      setExpense(found);
      if (found?.studentId) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  function confirmDelete() {
    if (!profile || !id) return;
    Alert.alert('Delete this expense?', 'This permanently removes the expense record.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteExpense(profile.uid, id);
            router.replace('/expenses' as never);
          } catch (caught) {
            setError(expenseErrorMessage(caught));
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function markPaid() {
    if (!profile || !id || !expense) return;
    setBusy(true);
    setError(null);
    try {
      await updateReimbursementStatus(profile.uid, id, 'paid');
      setExpense({ ...expense, reimbursementStatus: 'paid', updatedAt: new Date() });
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="55%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!expense) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Expense not found" description={error ?? 'It may have been deleted, or the link is out of date.'} /></Screen>;

  const total = expenseTotal(expense);

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ gap: theme.space[8] }}>
          <Text token="h1">{expense.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
            <ReimbursementStatusChip status={expense.reimbursementStatus} />
            <Text token="caption" color={expense.reimbursable ? theme.colors.infoText : theme.colors.textMuted}>
              {expense.reimbursable ? 'Reimbursable' : 'Personal'}
            </Text>
          </View>
        </View>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        <Card variant="raised">
          <View style={{ gap: theme.space[8] }}>
            <Text token="micro" color={theme.colors.textSecondary}>Expense total</Text>
            <Text token="display" tabular>{formatPeso(total)}</Text>
            <Text token="caption" color={theme.colors.textMuted}>
              {`${formatPeso(expense.amountPerOccurrence)} per occurrence · ${expense.expenseDates.length} date${expense.expenseDates.length === 1 ? '' : 's'}`}
            </Text>
          </View>
        </Card>

        <View>
          <SectionHeader title="Details" />
          <Card variant="flat" padded={false}>
            <ListRow title="Category" subtitle={expenseCategoryLabel(expense.category)} leading={<Ionicons name="pricetag-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Student" subtitle={student?.nickname ?? 'Personal expense'} leading={<Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Dates" subtitle={expense.expenseDates.map(formatDisplayDate).join(', ')} leading={<Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />} />
          </Card>
        </View>

        {expense.notes ? <View><SectionHeader title="Notes" /><Card variant="flat"><Text token="body">{expense.notes}</Text></Card></View> : null}

        <View style={{ gap: theme.space[12] }}>
          {expense.reimbursementStatus === 'included_in_statement' ? <Button label="Mark as reimbursed" icon="checkmark-circle-outline" loading={busy} onPress={() => void markPaid()} fullWidth /> : null}
          <Button label="Edit expense" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/expense-edit', params: { id: expense.id } } as never)} fullWidth />
          <Button label="Delete expense" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmDelete} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
