import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Button,
  Avatar,
  Card,
  Chip,
  EmptyState,
  Screen,
  SessionStatusChip,
  Skeleton,
  Text,
  TopAppBar,
  useToast,
} from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
import { deleteSession, getSession, sessionErrorMessage, updateSessionStatus } from '@/services/sessions.service';
import { getStudent } from '@/services/students.service';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate, formatDisplayTime } from '@/utils/date';
import { isChargeable } from '@/utils/pricing';
import { runAfterNavigation, showToastAfterNavigation } from '@/utils/feedback';
import { formatSessionTimingHeading, getSessionTiming } from '@/utils/session-presentation';

export default function SessionDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const upsert = useSessionStore((state) => state.upsert);
  const remove = useSessionStore((state) => state.remove);
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
  const [session, setSession] = useState<Session | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) { setLoading(false); return; }
    try {
      const found = await getSession(profile.uid, id);
      setError(null);
      setSession(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) { setError(sessionErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [profile, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function markCompleted() {
    if (!profile || !session || busy || session.status !== 'scheduled' || !beginSubmit()) return;
    setBusy(true);
    setError(null);
    try {
      await updateSessionStatus(profile.uid, session.id, 'completed');
      const updated = { ...session, status: 'completed' as const, billable: true, updatedAt: new Date() };
      setSession(updated);
      upsert(updated);
      showToast('Session marked completed', 'success');
    } catch (caught) {
      const message = sessionErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      endSubmit();
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!profile || !id) return;
    Alert.alert('Delete this session?', 'This permanently removes the record. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!beginSubmit()) return;
        setBusy(true); setError(null);
        let leavingScreen = false;
        try { await deleteSession(profile.uid, id); leavingScreen = true; }
        catch (caught) { const message = sessionErrorMessage(caught); setError(message); showToast(message, 'danger'); return; }
        finally { endSubmit(); if (!leavingScreen) setBusy(false); }
        router.replace('/sessions' as never);
        runAfterNavigation(() => remove(id));
        showToastAfterNavigation(showToast, 'Session deleted');
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
          <EmptyState
            icon="alert-circle-outline"
            title="Session not found"
            description={error ?? 'It may have been deleted, or the link is out of date.'}
            action={<Button label="Try again" icon="refresh-outline" variant="secondary" onPress={() => void load()} />}
          />
        </View>
      </Screen>
    );
  }

  const charged = isChargeable(session);
  const timing = getSessionTiming(session, now);
  const isOverdue = timing.kind === 'overdue';
  const isOngoing = timing.kind === 'ongoing';
  const timingHeading = formatSessionTimingHeading(timing, student?.tutoringPlace);

  return (
    <Screen scroll header={<TopAppBar title="Session info" onBack={() => router.back()} />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="SESSION RECORD"
          title={session.subject}
          subtitle={student?.nickname ?? 'Student'}
          icon="calendar-outline"
          leading={(
            <Avatar
              name={student?.nickname}
              imageUrl={student?.avatarType === 'custom' ? student.customAvatarUrl : null}
              builtin={student?.avatarType === 'custom' ? 'default' : student?.avatarType}
              size="md"
            />
          )}
          status={<SessionStatusChip status={session.status} />}
          onBack={() => router.back()}
          showToolbar={false}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        {timing.kind === 'upcoming' || timing.kind === 'ongoing' || timing.kind === 'overdue' ? (
          <Card
            variant="raised"
            style={isOverdue
              ? { backgroundColor: theme.colors.dangerSubtle, borderColor: theme.colors.dangerBorder }
              : isOngoing
                ? { backgroundColor: theme.colors.successSubtle, borderColor: theme.colors.successBorder }
                : { backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}
          >
            <View style={{ gap: theme.space[8] }}>
              <Text token="h3" color={isOverdue ? theme.colors.dangerText : isOngoing ? theme.colors.successText : theme.colors.primary}>{timingHeading}</Text>
              <Text token="caption" color={isOverdue ? theme.colors.dangerText : theme.colors.textSecondary}>
                {isOverdue ? 'Mark it completed or reschedule to keep your records up to date.' : isOngoing ? 'This session is within its scheduled time.' : 'This session is coming up.'}
              </Text>
              {isOverdue || isOngoing ? (
                <View style={{ flexDirection: 'row', gap: theme.space[8], marginTop: theme.space[4] }}>
                  <View style={{ flex: 1 }}><Button label="Mark completed" loading={busy} onPress={() => void markCompleted()} fullWidth /></View>
                  <View style={{ flex: 1 }}><Button label="Reschedule" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/session-new', params: { sessionId: session.id } } as never)} fullWidth /></View>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        <RecordDetailSection title="SCHEDULE">
          <Card variant="raised" style={{ backgroundColor: theme.colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
              <View style={{ width: 48, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.infoSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.info} />
              </View>
              <View style={{ flex: 1, gap: theme.space[2] }}>
                <Text token="micro" color={theme.colors.textMuted}>DATE</Text>
                <Text token="h3">{formatDisplayDate(session.startsAt)}</Text>
                <Text token="caption" color={theme.colors.textSecondary}>
                  {formatDisplayTime(session.startsAt)} – {formatDisplayTime(session.endsAt)}
                </Text>
                {student?.tutoringPlace ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4], marginTop: theme.space[4] }}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                    <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{student.tutoringPlace}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: theme.space[2] }}>
                <Text token="micro" color={theme.colors.textMuted}>LENGTH</Text>
                <Text token="bodyStrong" tabular>{`${session.durationMinutes} min`}</Text>
              </View>
            </View>
          </Card>
        </RecordDetailSection>

        <RecordDetailMetrics
          metrics={[
            { label: 'RATE', value: `${formatPeso(session.appliedRate)} ${session.rateType === 'hourly' ? '/ hour' : '/ session'}` },
            { label: charged ? 'AMOUNT CHARGED' : 'SESSION FEE', value: formatPeso(session.sessionFee), tone: charged ? 'success' : undefined },
          ]}
        />
        {!charged ? <Text token="caption" color={theme.colors.textMuted} style={{ marginTop: -theme.space[12] }}>This session is not included in earnings.</Text> : null}

        <RecordDetailSection title="SESSION DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="person-outline" label="STUDENT" value={student?.nickname ?? 'Unknown student'} tone="info" divider />
            <RecordDetailRow icon="book-outline" label="TOPIC" value={session.topicCategory.replaceAll('_', ' ')} tone="neutral" divider />
            <RecordDetailRow icon="cash-outline" label="BILLING" value={session.rateType === 'hourly' ? 'Hourly rate' : 'Per-session rate'} tone="success" />
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

        <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">Manage session</Text>
              <Text token="caption" color={theme.colors.textMuted}>Update the record or move it to another schedule.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View style={{ flex: 1 }}><Button label="Edit" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-edit', params: { id: session.id } } as never)} fullWidth /></View>
              {session.status === 'scheduled' ? <View style={{ flex: 1 }}><Button label="Reschedule" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-new', params: { sessionId: session.id } } as never)} fullWidth /></View> : null}
            </View>
            <Button label="Delete session" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmDelete} fullWidth />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
