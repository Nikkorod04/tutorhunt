import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ReimbursementStatusChip,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
import { expenseCategoryLabel } from '@/constants/expenses';
import { deleteExpense, expenseErrorMessage, getExpense, updateReimbursementStatus } from '@/services/expenses.service';
import { getStudent } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Expense, Student } from '@/types';
import { expenseTotal } from '@/utils/pricing';
import { formatPeso, formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

export default function ExpenseDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) { setLoading(false); return; }
    try {
      const found = await getExpense(profile.uid, id);
      setExpense(found);
      if (found?.studentId) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) { setError(expenseErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  function confirmDelete() {
    if (!profile || !id) return;
    Alert.alert('Delete this expense?', 'This permanently removes the expense record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await deleteExpense(profile.uid, id); showToast('Expense deleted'); router.replace('/expenses' as never); }
        catch (caught) { const message = expenseErrorMessage(caught); setError(message); showToast(message, 'danger'); setBusy(false); }
      } },
    ]);
  }

  async function markPaid() {
    if (!profile || !id || !expense) return;
    setBusy(true);
    setError(null);
    try {
      await updateReimbursementStatus(profile.uid, id, 'paid');
      setExpense({ ...expense, reimbursementStatus: 'paid', updatedAt: new Date() });
      showToast('Expense marked as reimbursed');
    } catch (caught) { const message = expenseErrorMessage(caught); setError(message); showToast(message, 'danger'); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="38%" />
          <Skeleton variant="card" height={154} />
          <Skeleton variant="card" height={186} />
        </View>
      </Screen>
    );
  }

  if (!expense) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Expense not found" description={error ?? 'It may have been deleted, or the link is out of date.'} />
        </View>
      </Screen>
    );
  }

  const total = expenseTotal(expense);

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="EXPENSE RECORD"
          title={expense.title}
          subtitle={`${expenseCategoryLabel(expense.category)} · ${expense.reimbursable ? 'Reimbursable' : 'Personal'}`}
          icon="receipt-outline"
          status={<ReimbursementStatusChip status={expense.reimbursementStatus} />}
          onBack={() => router.back()}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <RecordDetailMetrics
          metrics={[
            { label: 'TOTAL', value: formatPeso(total), tone: expense.reimbursable ? 'info' : undefined },
            { label: 'PER OCCURRENCE', value: formatPesoCompact(expense.amountPerOccurrence) },
          ]}
        />
        <Text token="caption" color={theme.colors.textMuted} style={{ marginTop: -theme.space[12] }}>
          {`${expense.expenseDates.length} occurrence${expense.expenseDates.length === 1 ? '' : 's'} recorded`}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
          <Chip variant="status" tone={expense.reimbursable ? 'info' : 'neutral'} label={expense.reimbursable ? 'Reimbursable' : 'Personal'} icon="cash-outline" />
          <Chip variant="status" tone="neutral" label={expenseCategoryLabel(expense.category)} icon="pricetag-outline" />
        </View>

        <RecordDetailSection title="EXPENSE DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="pricetag-outline" label="CATEGORY" value={expenseCategoryLabel(expense.category)} tone="info" divider />
            <RecordDetailRow icon="person-outline" label="STUDENT" value={student?.nickname ?? 'Personal expense'} tone="neutral" divider />
            <RecordDetailRow icon="calendar-outline" label="DATES" value={expense.expenseDates.map(formatDisplayDate).join(', ')} tone="info" />
          </Card>
        </RecordDetailSection>

        {expense.notes ? (
          <RecordDetailSection title="NOTES">
            <Card variant="flat"><Text token="body">{expense.notes}</Text></Card>
          </RecordDetailSection>
        ) : null}

        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">Manage expense</Text>
              <Text token="caption" color={theme.colors.textMuted}>Keep reimbursement status and expense details up to date.</Text>
            </View>
            {expense.reimbursementStatus === 'included_in_statement' ? <Button label="Mark as reimbursed" icon="checkmark-circle-outline" loading={busy} onPress={() => void markPaid()} fullWidth /> : null}
            <Button label="Edit expense" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/expense-edit', params: { id: expense.id } } as never)} fullWidth />
            <Button label="Delete expense" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmDelete} fullWidth />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
