import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  StatTile,
  Text,
} from '@/components/ui';
import { getEarningsSnapshot, type EarningsSnapshot } from '@/services/earnings.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { formatPeso, formatPesoCompact } from '@/utils/currency';
import { manilaParts, parseIsoDate } from '@/utils/date';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

function monthStart(date: Date): Date {
  const parts = manilaParts(date);
  return parseIsoDate(`${parts.year}-${String(parts.month + 1).padStart(2, '0')}-01`) ?? date;
}

function shiftMonth(date: Date, amount: number): Date {
  const parts = manilaParts(date);
  const shifted = new Date(Date.UTC(parts.year, parts.month + amount, 1));
  return parseIsoDate(
    `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`,
  ) ?? date;
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} h`;
}

export default function EarningsScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [snapshot, setSnapshot] = useState<EarningsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthParts = manilaParts(month);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const studentPage = await listStudents(profile.uid, { pageSize: 100 });
      setSnapshot(await getEarningsSnapshot(profile.uid, month, studentPage.items));
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'Could not load earnings.');
    } finally {
      setLoading(false);
    }
  }, [profile, month]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="h1">Earnings</Text>
            <Text token="caption" color={theme.colors.textMuted}>A clear view of cash received, charges and costs.</Text>
          </View>
          <IconButton icon="refresh" accessibilityLabel="Refresh earnings" onPress={() => void load()} />
        </View>

        <Card variant="raised">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton icon="chevron-back" variant="tonal" accessibilityLabel="Previous month" onPress={() => setMonth((current) => shiftMonth(current, -1))} />
            <Text token="bodyStrong">{MONTH_NAMES[monthParts.month]} {monthParts.year}</Text>
            <IconButton icon="chevron-forward" variant="tonal" accessibilityLabel="Next month" onPress={() => setMonth((current) => shiftMonth(current, 1))} />
          </View>
        </Card>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        {loading && !snapshot ? (
          <View style={{ gap: theme.space[16] }}><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" /></View>
        ) : snapshot ? (
          <>
            <Card variant="raised">
              <View style={{ gap: theme.space[16] }}>
                <StatTile label="Gross session earnings" value={snapshot.grossSessionEarnings} variant="hero" animate />
                <Text token="caption" color={theme.colors.textMuted}>
                  Accrual: billable sessions during this month, whether paid or not.
                </Text>
                <View style={{ height: 0.5, backgroundColor: theme.colors.borderSubtle }} />
                <View style={{ flexDirection: 'row', gap: theme.space[16] }}>
                  <View style={{ flex: 1 }}><StatTile label="Payments received" value={snapshot.paymentsReceived} /></View>
                  <View style={{ flex: 1 }}><StatTile label="Net cash income" value={snapshot.netIncome} /></View>
                </View>
              </View>
            </Card>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[12] }}>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Outstanding" value={snapshot.outstanding} />
              </Card>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Tutor costs" value={snapshot.tutorCosts} />
              </Card>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Reimbursable expenses" value={snapshot.reimbursableExpenses} />
              </Card>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Reimbursed expenses" value={snapshot.reimbursedExpenses} />
              </Card>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Sessions" value={snapshot.sessionCount} format={(value) => String(Math.round(value))} />
              </Card>
              <Card variant="flat" style={{ flexBasis: '47%', flexGrow: 1 }}>
                <StatTile label="Tutoring time" value={snapshot.tutoringMinutes} format={formatHours} />
              </Card>
            </View>

            <Card variant="accent">
              <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
                <View style={{ flex: 1, gap: theme.space[4] }}>
                  <Text token="caption" color={theme.colors.warningText}>How to read this</Text>
                  <Text token="caption" color={theme.colors.warningText}>
                    Gross is earned revenue. Net cash is payments received minus non-reimbursable tutor costs; they measure different things.
                  </Text>
                </View>
              </View>
            </Card>

            <View>
              <SectionHeader title="Student balances" />
              {snapshot.studentBalances.length > 0 ? (
                <Card variant="flat" padded={false}>
                  {snapshot.studentBalances.map((balance, index) => (
                    <ListRow
                      key={balance.studentId}
                      title={balance.studentName}
                      subtitle={`${formatPesoCompact(balance.paymentsReceived)} received · ${formatPesoCompact(balance.charges)} charged`}
                      leading={<Ionicons name="person-outline" size={18} color={theme.colors.primary} />}
                      trailing={<Text token="caption" tabular color={balance.outstanding < 0 ? theme.colors.successText : theme.colors.textPrimary}>{formatPeso(balance.outstanding)}</Text>}
                      divider={index < snapshot.studentBalances.length - 1}
                    />
                  ))}
                </Card>
              ) : (
                <Card variant="flat"><EmptyState icon="people-outline" title="No students yet" description="Student balances will appear after you add students." /></Card>
              )}
            </View>

            <View style={{ gap: theme.space[12] }}>
              <Button label="Record payment" icon="add" onPress={() => router.push('/payment-new' as never)} fullWidth />
              <Button label="View payment history" variant="secondary" onPress={() => router.push('/payments' as never)} fullWidth />
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
