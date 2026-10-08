import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Badge, Button, Card, Chip, DateField, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
import { activePlanFor } from '@/constants/plans';
import { cancelRecurringSeries, extendRecurringSeries, getRecurringSeries, recurringErrorMessage } from '@/services/recurring.service';
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

export default function RecurringDetailScreen() {
  const theme = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const plan = activePlanFor(entitlement);
  const { showToast } = useToast();
  const [series, setSeries] = useState<RecurringSeries | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extendDate, setExtendDate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }

    try {
      const found = await getRecurringSeries(profile.uid, id);
      setSeries(found);
      if (found) {
        const page = await listStudents(profile.uid, { pageSize: 100 });
        setStudent(page.items.find((item) => item.id === found.studentId) ?? null);
      } else {
        setStudent(null);
      }
    } catch (caught) {
      setError(recurringErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (series && !extendDate) setExtendDate(series.endDate); }, [series, extendDate]);

  function cancel() {
    if (!profile || !id) return;
    Alert.alert('Cancel series?', 'Future uncompleted sessions will be removed. Completed or billable sessions are kept.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel series',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelRecurringSeries(profile.uid, plan, id);
            showToast('Recurring series cancelled');
            await load();
          } catch (caught) {
            const message = recurringErrorMessage(caught);
            setError(message);
            showToast(message, 'danger');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function extend() {
    if (!profile || !id || !extendDate || !series) return;
    setBusy(true);
    setError(null);
    try {
      await extendRecurringSeries(profile.uid, plan, id, extendDate, series.skipDates);
      showToast('Recurring series extended');
      await load();
    } catch (caught) {
      const message = recurringErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="36%" />
          <Skeleton variant="card" height={166} />
          <Skeleton variant="card" height={194} />
        </View>
      </Screen>
    );
  }

  if (!series) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Series not found" description={error ?? 'This series may have been removed.'} />
        </View>
      </Screen>
    );
  }

  const isActive = series.status === 'active';

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="RECURRING SERIES"
          title={series.subject}
          subtitle={`${student?.nickname ?? 'Student'} · ${formatDisplayDate(series.startDate)} – ${formatDisplayDate(series.endDate)}`}
          icon="repeat-outline"
          status={<Badge label={statusLabel(series.status)} tone={statusTone(series.status)} />}
          onBack={() => router.back()}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="micro" color={theme.colors.primary}>WEEKLY SCHEDULE</Text>
                <Text token="h2">{`${series.startTime} – ${series.endTime}`}</Text>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Text token="h3" color={theme.colors.primary}>{series.weekdays.length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {series.weekdays.map((weekday) => <Chip key={weekday} variant="status" tone="info" label={weekdayLabel(weekday)} icon="calendar-outline" />)}
            </View>
          </View>
        </Card>

        <RecordDetailMetrics
          metrics={[
            { label: 'GENERATED SESSIONS', value: String(series.generatedSessionIds.length) },
            { label: 'RATE', value: `${formatPesoCompact(series.appliedRate)} ${series.rateType === 'hourly' ? '/ hour' : '/ session'}`, tone: 'success' },
          ]}
        />

        <RecordDetailSection title="SERIES DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="person-outline" label="STUDENT" value={student?.nickname ?? 'Student'} tone="info" divider />
            <RecordDetailRow icon="calendar-outline" label="DATE RANGE" value={`${formatDisplayDate(series.startDate)} – ${formatDisplayDate(series.endDate)}`} tone="info" divider />
            <RecordDetailRow icon="time-outline" label="TIME" value={`${series.startTime} – ${series.endTime}`} tone="neutral" divider />
            <RecordDetailRow icon="cash-outline" label="RATE" value={`${formatPesoCompact(series.appliedRate)} ${series.rateType === 'hourly' ? 'per hour' : 'per session'}`} tone="success" divider />
            <RecordDetailRow icon="sunny-outline" label="SKIPPED DATES" value={series.skipDates.length === 0 ? 'None' : `${series.skipDates.length} skipped`} tone="neutral" />
          </Card>
        </RecordDetailSection>

        {isActive && plan === 'pro' ? (
          <RecordDetailSection title="EXTEND SERIES">
            <Card variant="raised">
              <View style={{ gap: theme.space[12] }}>
                <View style={{ gap: theme.space[4] }}>
                  <Text token="h3">Add future dates</Text>
                  <Text token="caption" color={theme.colors.textMuted}>Only new dates are generated; existing sessions are never duplicated.</Text>
                </View>
                <DateField label="New last session" value={extendDate} onChange={setExtendDate} />
                <Button label="Extend series" icon="arrow-forward-outline" variant="secondary" loading={busy} onPress={extend} fullWidth />
              </View>
            </Card>
          </RecordDetailSection>
        ) : null}

        {isActive && plan !== 'pro' ? (
          <Card variant="premium">
            <EmptyState icon="lock-closed-outline" title="Pro access required" description="Upgrade to edit or extend this recurring series." action={<Button label="View Pro plans" icon="star-outline" onPress={() => router.push('/upgrade' as never)} />} />
          </Card>
        ) : null}

        {isActive && plan === 'pro' ? (
          <Card variant="flat">
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="h3">Manage series</Text>
                <Text token="caption" color={theme.colors.textMuted}>Edit future sessions or stop this series from generating more dates.</Text>
              </View>
              <Button label="Edit future sessions" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/recurring-edit', params: { id: series.id } } as never)} fullWidth />
              <Button label="Cancel series" icon="close-circle-outline" variant="destructive" loading={busy} onPress={cancel} fullWidth />
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
