import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { PaymentForm } from '@/components/PaymentForm';
import { getPayment, paymentErrorMessage, updatePayment, type PaymentInput } from '@/services/payments.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Payment, Student } from '@/types';

export default function PaymentEditScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }
    try {
      const [found, studentPage] = await Promise.all([
        getPayment(profile.uid, id),
        listStudents(profile.uid, { pageSize: 100 }),
      ]);
      setPayment(found);
      setStudents(studentPage.items);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(input: PaymentInput) {
    if (!profile || !id) return;
    setBusy(true);
    setError(null);
    try {
      await updatePayment(profile.uid, id, input);
      showToast('Payment updated successfully');
      router.replace({ pathname: '/payment-detail', params: { id } } as never);
    } catch (caught) {
      const message = paymentErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="55%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  if (!payment) {
    return <Screen scroll><EmptyState icon="alert-circle-outline" title="Payment not found" description={error ?? 'It may have been deleted, or the link is out of date.'} /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <FormHeader eyebrow="PAYMENT LEDGER" title="Edit payment" description="Correct the amount, date or payment details in this ledger entry." icon="create-outline" />
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        <PaymentForm
          students={students}
          initial={payment}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={(input) => void handleSubmit(input)}
        />
      </View>
    </Screen>
  );
}
