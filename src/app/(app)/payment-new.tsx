import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { PaymentForm } from '@/components/PaymentForm';
import { createPayment, paymentErrorMessage, type PaymentInput } from '@/services/payments.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Student } from '@/types';

export default function PaymentNewScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const preferredStudentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const page = await listStudents(profile.uid, { pageSize: 100 });
      setStudents(page.items);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  async function handleSubmit(input: PaymentInput) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createPayment(profile.uid, input);
      showToast('Payment recorded successfully');
      router.replace({ pathname: '/payment-detail', params: { id } } as never);
    } catch (caught) {
      const message = paymentErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <View style={{ gap: theme.space[4] }}>
          <FormHeader eyebrow="PAYMENT LEDGER" title="Record payment" description="Record money received against a student so balances stay accurate." icon="card-outline" />
        </View>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        {!loading && students.length === 0 ? (
          <Card variant="flat">
            <EmptyState
              icon="people-outline"
              title="Add a student first"
              description="Payments need to be linked to a student so balances remain accurate."
              action={<Text token="caption" color={theme.colors.textMuted}>Use the Students tab to add one.</Text>}
            />
          </Card>
        ) : null}
        {!loading && students.length > 0 ? (
          <PaymentForm
            students={students}
            preferredStudentId={preferredStudentId}
            submitLabel="Save payment"
            busy={busy}
            onSubmit={(input) => void handleSubmit(input)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
