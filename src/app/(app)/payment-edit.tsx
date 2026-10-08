import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
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
      router.replace({ pathname: '/payment-detail', params: { id } } as never);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
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
        <Text token="h1">Edit payment</Text>
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
