import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, EmptyState, ListRow, Screen, Skeleton, Text } from '@/components/ui';
import { deletePayment, getPayment, paymentErrorMessage } from '@/services/payments.service';
import { getStudent } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Payment, Student } from '@/types';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

const METHOD_LABELS: Record<Payment['method'], string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank transfer',
  other: 'Other',
};

export default function PaymentDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const [payment, setPayment] = useState<Payment | null>(null);
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
      const found = await getPayment(profile.uid, id);
      setPayment(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  function confirmDelete() {
    if (!profile || !id) return;
    Alert.alert('Delete payment?', 'This removes the payment from the student balance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deletePayment(profile.uid, id);
              router.replace('/payments' as never);
            } catch (caught) {
              setError(paymentErrorMessage(caught));
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  if (loading) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="60%" height={32} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  if (!payment) {
    return <Screen scroll><EmptyState icon="alert-circle-outline" title="Payment not found" description={error ?? 'It may have been deleted, or the link is out of date.'} /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ gap: theme.space[4] }}>
          <Text token="h1">{formatPeso(payment.amount)}</Text>
          <Text token="caption" color={theme.colors.textMuted}>
            {student?.nickname ?? 'Student'} · {formatDisplayDate(payment.datePaid)}
          </Text>
        </View>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        <Card variant="raised">
          <View style={{ gap: theme.space[4] }}>
            <ListRow title="Student" subtitle={student?.nickname ?? 'Unknown student'} leading={<Ionicons name="person-outline" size={18} color={theme.colors.primary} />} divider />
            <ListRow title="Date paid" subtitle={formatDisplayDate(payment.datePaid)} leading={<Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Method" subtitle={METHOD_LABELS[payment.method]} leading={<Ionicons name="wallet-outline" size={18} color={theme.colors.textMuted} />} divider />
            {payment.reference ? <ListRow title="Reference" subtitle={payment.reference} leading={<Ionicons name="bookmark-outline" size={18} color={theme.colors.textMuted} />} divider /> : null}
            {payment.notes ? <ListRow title="Notes" subtitle={payment.notes} leading={<Ionicons name="document-text-outline" size={18} color={theme.colors.textMuted} />} /> : null}
          </View>
        </Card>

        <View style={{ gap: theme.space[12] }}>
          <Button label="Edit payment" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/payment-edit', params: { id: payment.id } } as never)} fullWidth />
          <Button label="Delete payment" variant="destructive" onPress={confirmDelete} loading={busy} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
