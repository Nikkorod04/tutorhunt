import React, { useState } from 'react';
import { View } from 'react-native';

import { EXPENSE_CATEGORIES } from '@/constants/expenses';
import {
  Button,
  Card,
  Chip,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ui';
import { ExpenseDateCalendar } from '@/components/ExpenseDateCalendar';
import type { ExpenseInput } from '@/services/expenses.service';
import type { Expense, Student } from '@/types';
import { useTheme } from '@/theme';
import { expenseTotal } from '@/utils/pricing';
import { formatDisplayDate, formatIsoDate } from '@/utils/date';
import {
  issuesByField,
  LIMITS,
  parseRate,
  validateExpense,
  type ExpenseFormValues,
} from '@/utils/validation';

export interface ExpenseFormProps {
  students: Student[];
  initial?: Expense | null;
  preferredStudentId?: string;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: ExpenseInput) => void;
}

function sameDay(left: Date, right: Date): boolean {
  return formatIsoDate(left) === formatIsoDate(right);
}

export function ExpenseForm({
  students,
  initial = null,
  preferredStudentId,
  submitLabel,
  busy = false,
  onSubmit,
}: ExpenseFormProps) {
  const theme = useTheme();
  const [values, setValues] = useState<ExpenseFormValues>({
    studentId: initial?.studentId ?? preferredStudentId ?? null,
    title: initial?.title ?? '',
    category: initial?.category ?? 'transportation',
    amountPerOccurrence: initial ? String(initial.amountPerOccurrence) : '',
    expenseDates: initial?.expenseDates.length ? initial.expenseDates : [new Date()],
    notes: initial?.notes ?? '',
    reimbursable: initial?.reimbursable ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function toggleDate(date: Date) {
    const alreadySelected = values.expenseDates.some((item) => sameDay(item, date));
    const nextDates = alreadySelected
      ? values.expenseDates.filter((item) => !sameDay(item, date))
      : [...values.expenseDates, date];

    update('expenseDates', nextDates.sort((a, b) => a.getTime() - b.getTime()));
  }

  function removeDate(date: Date) {
    update('expenseDates', values.expenseDates.filter((item) => !sameDay(item, date)));
  }

  function handleSubmit() {
    const issues = validateExpense(values);
    const byField = issuesByField(issues);
    if (issues.length > 0) {
      setErrors(byField);
      return;
    }

    onSubmit({
      studentId: values.studentId,
      title: values.title.trim(),
      category: values.category,
      amountPerOccurrence: parseRate(values.amountPerOccurrence)!,
      expenseDates: values.expenseDates,
      notes: values.notes.trim(),
      reimbursable: values.reimbursable,
      receiptUrl: null,
    });
  }

  const total = expenseTotal({
    amountPerOccurrence: parseRate(values.amountPerOccurrence) ?? 0,
    expenseDates: values.expenseDates,
  });

  return (
    <View style={{ gap: theme.space[24] }}>
      <Card variant="raised">
        <SectionHeader title="Expense" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Title"
            value={values.title}
            onChangeText={(value) => update('title', value)}
            placeholder="Jeepney fare"
            icon="receipt-outline"
            autoCapitalize="sentences"
            maxLength={LIMITS.expenseTitle}
            error={errors.title}
          />

          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {EXPENSE_CATEGORIES.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  icon={item.icon}
                  selected={values.category === item.value}
                  onPress={() => update('category', item.value)}
                />
              ))}
            </View>
          </View>

          <TextField
            label="Amount per occurrence"
            value={values.amountPerOccurrence}
            onChangeText={(value) => update('amountPerOccurrence', value)}
            placeholder="40"
            keyboardType="decimal-pad"
            icon="cash-outline"
            error={errors.amountPerOccurrence}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Dates" />
        <View style={{ gap: theme.space[12] }}>
          <ExpenseDateCalendar
            selectedDates={values.expenseDates}
            onToggleDate={toggleDate}
            error={errors.expenseDates}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {values.expenseDates.map((date) => (
              <Chip
                key={formatDisplayDate(date)}
                label={formatDisplayDate(date)}
                variant="removable"
                onRemove={() => removeDate(date)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text token="caption" color={theme.colors.textMuted}>Expense total</Text>
            <Text token="h3" tabular>{`₱${total.toFixed(2)}`}</Text>
          </View>
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Student and reimbursement" />
        <View style={{ gap: theme.space[12] }}>
          <Text token="caption" color={theme.colors.textSecondary}>
            Optional for personal costs. Required when reimbursable.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            <Chip label="Personal" selected={values.studentId === null} onPress={() => update('studentId', null)} />
            {students.map((student) => (
              <Chip
                key={student.id}
                label={student.nickname}
                selected={values.studentId === student.id}
                onPress={() => update('studentId', student.id)}
              />
            ))}
          </View>
          {errors.studentId ? <Text token="caption" color={theme.colors.danger}>{errors.studentId}</Text> : null}
          <Chip
            label="Reimbursable by parent"
            icon="cash-outline"
            selected={values.reimbursable}
            onPress={() => update('reimbursable', !values.reimbursable)}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Notes" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Notes"
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
