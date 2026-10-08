import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SessionStatusChip,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
import { deleteSession, getSession, sessionErrorMessage } from '@/services/sessions.service';
import { getStudent } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate, formatDisplayTime } from '@/utils/date';
import { isChargeable } from '@/utils/pricing';

export default function SessionDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const remove = useSessionStore((state) => state.remove);
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) { setLoading(false); return; }
    try {
      const found = await getSession(profile.uid, id);
      setSession(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) { setError(sessionErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  function confirmDelete() {
    if (!profile || !id) return;
    Alert.alert('Delete this session?', 'This permanently removes the record. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true); setError(null);
        try { await deleteSession(profile.uid, id); remove(id); showToast('Session deleted'); router.replace('/sessions' as never); }
        catch (caught) { const message = sessionErrorMessage(caught); setError(message); showToast(message, 'danger'); setBusy(false); }
      } },
    ]);
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="32%" />
          <Skeleton variant="card" height={150} />
          <Skeleton variant="card" height={174} />
        </View>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Session not found" description="It may have been deleted, or the link is out of date." />
        </View>
      </Screen>
    );
  }

  const charged = isChargeable(session);

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="SESSION RECORD"
          title={session.subject}
          subtitle={`${student?.nickname ?? 'Student'} · ${formatDisplayDate(session.startsAt)}`}
          icon="calendar-outline"
          status={<SessionStatusChip status={session.status} />}
          onBack={() => router.back()}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <RecordDetailMetrics
          metrics={[
            { label: 'DURATION', value: `${session.durationMinutes} min` },
            { label: charged ? 'AMOUNT CHARGED' : 'SESSION FEE', value: formatPeso(session.sessionFee), tone: charged ? 'success' : undefined },
          ]}
        />
        {!charged ? <Text token="caption" color={theme.colors.textMuted} style={{ marginTop: -theme.space[12] }}>This session is not included in earnings.</Text> : null}

        <RecordDetailSection title="SESSION DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="person-outline" label="STUDENT" value={student?.nickname ?? 'Unknown student'} tone="info" divider />
            <RecordDetailRow icon="calendar-outline" label="DATE" value={formatDisplayDate(session.startsAt)} tone="info" divider />
            <RecordDetailRow icon="time-outline" label="TIME" value={`${formatDisplayTime(session.startsAt)} – ${formatDisplayTime(session.endsAt)}`} tone="neutral" divider />
            <RecordDetailRow icon="book-outline" label="TOPIC" value={session.topicDetails || session.topicCategory.replaceAll('_', ' ')} tone="neutral" divider />
            <RecordDetailRow icon="cash-outline" label="RATE" value={`${formatPeso(session.appliedRate)} ${session.rateType === 'hourly' ? 'per hour' : 'per session'}`} tone="success" />
          </Card>
        </RecordDetailSection>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
          <Chip variant="status" tone={session.billable ? 'success' : 'neutral'} label={session.billable ? 'Billable' : 'Not billable'} icon="cash-outline" />
          {session.recurringGroupId ? <Chip variant="status" tone="premium" label="Recurring session" icon="repeat-outline" /> : null}
        </View>

        {session.notes ? (
          <RecordDetailSection title="NOTES">
            <Card variant="flat"><Text token="body">{session.notes}</Text></Card>
          </RecordDetailSection>
        ) : null}

        {session.status === 'rescheduled' && session.rescheduledToId ? (
          <Card variant="raised" style={{ backgroundColor: theme.colors.infoSubtle, borderColor: theme.colors.infoBorder }}>
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="h3">This session was rescheduled</Text>
                <Text token="caption" color={theme.colors.textMuted}>View the replacement session to see the updated schedule.</Text>
              </View>
              <Button label="View replacement" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-detail', params: { id: session.rescheduledToId! } } as never)} fullWidth />
            </View>
          </Card>
        ) : null}

        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">Manage session</Text>
              <Text token="caption" color={theme.colors.textMuted}>Update the record or plan a replacement when needed.</Text>
            </View>
            {session.status !== 'rescheduled' ? <Button label="Edit session" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-edit', params: { id: session.id } } as never)} fullWidth /> : null}
            {session.status === 'scheduled' ? <Button label="Reschedule" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-new', params: { rescheduleFrom: session.id, studentId: session.studentId } } as never)} fullWidth /> : null}
            <Button label="Delete session" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmDelete} fullWidth />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
