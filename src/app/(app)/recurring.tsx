import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Chip, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { RecordListCard, RecordListSummary } from '@/components/RecordList';
import { activePlanFor } from '@/constants/plans';
import { listRecurringSeries, recurringErrorMessage } from '@/services/recurring.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { RecurringSeries, Student } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';
import { weekdayLabel } from '@/utils/recurrence';

function statusLabel(status: RecurringSeries['status']): string {
  if (status === 'active') return 'Active';
  if (status === 'cancelled') return 'Cancelled';
  return 'Ended';
}

function statusTone(status: RecurringSeries['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'cancelled') return 'warning';
  return 'neutral';
}

function rateLabel(series: RecurringSeries): string {
  return `${formatPesoCompact(series.appliedRate)} ${series.rateType === 'hourly' ? '/ hour' : '/ session'}`;
}

export default function RecurringSessionsScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const plan = activePlanFor(entitlement);
  const [items, setItems] = useState<RecurringSeries[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [page, studentPage] = await Promise.all([
        listRecurringSeries(profile.uid),
        listStudents(profile.uid, { pageSize: 100 }),
      ]);
      setItems(page.items);
      setStudents(studentPage.items);
      setError(null);
    } catch (caught) {
      setError(recurringErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="48%" />
          <Skeleton variant="card" height={142} />
          <Skeleton variant="card" height={178} />
          <Skeleton variant="card" height={178} />
        </View>
      </Screen>
    );
  }

  if (plan !== 'pro') {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="h1">Recurring sessions</Text>
            <Text token="caption" color={theme.colors.textMuted}>Keep weekly tutoring schedules organized in one place.</Text>
          </View>
          <Card variant="premium">
            <EmptyState
              icon="repeat-outline"
              title="Recurring sessions are a Pro feature"
              description="Create weekly sessions, skip holidays, and manage an entire series from one place."
              action={<Button label="View Pro plans" icon="star-outline" onPress={() => router.push('/upgrade' as never)} />}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  const studentName = (id: string) => students.find((student) => student.id === id)?.nickname ?? 'Student';
  const activeCount = items.filter((item) => item.status === 'active').length;

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.space[12] }}>
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="h1">Recurring sessions</Text>
            <Text token="caption" color={theme.colors.textMuted}>Manage weekly session series and future dates.</Text>
          </View>
          <Button label="New" icon="add" size="sm" onPress={() => router.push('/recurring-new' as never)} />
        </View>

        {items.length > 0 ? (
          <RecordListSummary
            icon="repeat-outline"
            label="WEEKLY SERIES"
            value={`${activeCount} active`}
            description={`${items.length} series in your recurring schedule.`}
            aside={<Badge label="Pro" variant="plan" tone="premium" />}
          />
        ) : null}

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        {items.length === 0 ? (
          <Card variant="flat">
            <EmptyState
              icon="repeat-outline"
              title="No recurring series"
              description="Create a series for a regular weekly schedule."
              action={<Button label="Create series" icon="add" onPress={() => router.push('/recurring-new' as never)} />}
            />
          </Card>
        ) : (
          <View style={{ gap: theme.space[12] }}>
            <Text token="micro" color={theme.colors.textSecondary}>YOUR SERIES</Text>
            {items.map((item) => (
              <RecordListCard
                key={item.id}
                icon="repeat-outline"
                iconTone={statusTone(item.status)}
                title={item.subject}
                subtitle={`${studentName(item.studentId)} · ${formatDisplayDate(item.startDate)} – ${formatDisplayDate(item.endDate)}`}
                amount={rateLabel(item)}
                status={<Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />}
                tags={
                  <>
                    <Chip variant="status" tone="info" label={item.weekdays.map(weekdayLabel).join(' · ')} icon="calendar-outline" />
                    <Chip variant="status" tone="neutral" label={`${item.startTime} – ${item.endTime}`} icon="time-outline" />
                    <Chip variant="status" tone="neutral" label={`${item.generatedSessionIds.length} sessions`} icon="list-outline" />
                  </>
                }
                actionLabel="View series"
                onPress={() => router.push({ pathname: '/recurring-detail', params: { id: item.id } } as never)}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
