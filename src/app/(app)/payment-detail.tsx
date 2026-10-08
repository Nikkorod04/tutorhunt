import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
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
  const { showToast } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) { setLoading(false); return; }
    try {
      const found = await getPayment(profile.uid, id);
      setPayment(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) { setError(paymentErrorMessage(caught)); }
    finally { setLoading(false); }
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
            try { await deletePayment(profile.uid, id); showToast('Payment deleted'); router.replace('/payments' as never); }
            catch (caught) { const message = paymentErrorMessage(caught); setError(message); showToast(message, 'danger'); }
            finally { setBusy(false); }
          })();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="34%" />
          <Skeleton variant="card" height={148} />
          <Skeleton variant="card" height={190} />
        </View>
      </Screen>
    );
  }

  if (!payment) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Payment not found" description={error ?? 'It may have been deleted, or the link is out of date.'} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="PAYMENT RECORD"
          title={formatPeso(payment.amount)}
          subtitle={`${student?.nickname ?? 'Student'} · Paid ${formatDisplayDate(payment.datePaid)}`}
          icon="wallet-outline"
          status={<Chip variant="status" tone="success" label={METHOD_LABELS[payment.method]} icon="cash-outline" />}
          onBack={() => router.back()}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <RecordDetailMetrics
          metrics={[
            { label: 'AMOUNT RECEIVED', value: formatPeso(payment.amount), tone: 'success' },
            { label: 'METHOD', value: METHOD_LABELS[payment.method] },
          ]}
        />

        <RecordDetailSection title="PAYMENT DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="person-outline" label="STUDENT" value={student?.nickname ?? 'Unknown student'} tone="info" divider />
            <RecordDetailRow icon="calendar-outline" label="DATE PAID" value={formatDisplayDate(payment.datePaid)} tone="info" divider />
            <RecordDetailRow icon="wallet-outline" label="PAYMENT METHOD" value={METHOD_LABELS[payment.method]} tone="success" divider />
            {payment.reference ? <RecordDetailRow icon="bookmark-outline" label="REFERENCE" value={payment.reference} tone="neutral" /> : null}
          </Card>
        </RecordDetailSection>

        {payment.notes ? (
          <RecordDetailSection title="NOTES">
            <Card variant="flat"><Text token="body">{payment.notes}</Text></Card>
          </RecordDetailSection>
        ) : null}

        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">Manage payment</Text>
              <Text token="caption" color={theme.colors.textMuted}>Correct the record or remove it from the student balance.</Text>
            </View>
            <Button label="Edit payment" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/payment-edit', params: { id: payment.id } } as never)} fullWidth />
            <Button label="Delete payment" icon="trash-outline" variant="destructive" onPress={confirmDelete} loading={busy} fullWidth />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
