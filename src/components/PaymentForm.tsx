import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  DateField,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ui';
import type { PaymentInput } from '@/services/payments.service';
import type { Payment, PaymentMethod, Student } from '@/types';
import { useTheme } from '@/theme';
import {
  issuesByField,
  LIMITS,
  parseRate,
  validatePayment,
  type PaymentFormValues,
} from '@/utils/validation';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: 'cash-outline' | 'phone-portrait-outline' | 'card-outline' | 'ellipsis-horizontal-circle-outline' }[] = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
  { value: 'maya', label: 'Maya', icon: 'phone-portrait-outline' },
  { value: 'bank', label: 'Bank', icon: 'card-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export interface PaymentFormProps {
  students: Student[];
  initial?: Payment | null;
  preferredStudentId?: string;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: PaymentInput) => void;
}

export function PaymentForm({
  students,
  initial = null,
  preferredStudentId,
  submitLabel,
  busy = false,
  onSubmit,
}: PaymentFormProps) {
  const theme = useTheme();
  const [values, setValues] = useState<PaymentFormValues>({
    studentId: initial?.studentId ?? preferredStudentId ?? students[0]?.id ?? '',
    amount: initial ? String(initial.amount) : '',
    datePaid: initial?.datePaid ?? new Date(),
    method: initial?.method ?? 'cash',
    reference: initial?.reference ?? '',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof PaymentFormValues>(key: K, value: PaymentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function handleSubmit() {
    const issues = validatePayment(values);
    const byField = issuesByField(issues);
    if (issues.length > 0) {
      setErrors(byField);
      return;
    }

    onSubmit({
      studentId: values.studentId,
      amount: parseRate(values.amount)!,
      datePaid: values.datePaid!,
      method: values.method,
      reference: values.reference.trim(),
      notes: values.notes.trim(),
    });
  }

  return (
    <View style={{ gap: theme.space[24] }}>
      <Card variant="raised">
        <SectionHeader title="Payment" />
        <View style={{ gap: theme.space[16] }}>
          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>Student</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {students.map((student) => (
                <Chip
                  key={student.id}
                  label={student.nickname}
                  selected={values.studentId === student.id}
                  onPress={() => update('studentId', student.id)}
                />
              ))}
            </View>
            {students.length === 0 ? (
              <Text token="caption" color={theme.colors.textMuted}>
                Add a student before recording a payment.
              </Text>
            ) : null}
            {errors.studentId ? <Text token="caption" color={theme.colors.danger}>{errors.studentId}</Text> : null}
          </View>

          <TextField
            label="Amount received"
            value={values.amount}
            onChangeText={(value) => update('amount', value)}
            placeholder="500"
            keyboardType="decimal-pad"
            icon="cash-outline"
            error={errors.amount}
          />

          <DateField
            label="Date paid"
            value={values.datePaid}
            onChange={(date) => update('datePaid', date)}
            error={errors.datePaid}
          />

          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>Payment method</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {PAYMENT_METHODS.map((method) => (
                <Chip
                  key={method.value}
                  label={method.label}
                  icon={method.icon}
                  selected={values.method === method.value}
                  onPress={() => update('method', method.value)}
                />
              ))}
            </View>
          </View>
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Details" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Reference (optional)"
            value={values.reference}
            onChangeText={(value) => update('reference', value)}
            placeholder="Receipt number or transfer reference"
            icon="bookmark-outline"
            maxLength={LIMITS.paymentReference}
            error={errors.reference}
          />
          <TextField
            label="Notes (optional)"
            value={values.notes}
            onChangeText={(value) => update('notes', value)}
            placeholder="Anything worth remembering."
            multiline
            maxLength={LIMITS.notes}
            showCounter
            error={errors.notes}
          />
        </View>
      </Card>

      <Button label={submitLabel} onPress={handleSubmit} loading={busy} fullWidth />
    </View>
  );
}
