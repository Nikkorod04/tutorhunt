import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, EmptyState, ListRow, Screen, SectionHeader, SessionStatusChip, Skeleton, Text } from '@/components/ui';
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
        try { await deleteSession(profile.uid, id); remove(id); router.replace('/sessions' as never); }
        catch (caught) { setError(sessionErrorMessage(caught)); setBusy(false); }
      } },
    ]);
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="50%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!session) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session not found" description="It may have been deleted, or the link is out of date." /></Screen>;

  const charged = isChargeable(session);
  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ gap: theme.space[8] }}>
          <Text token="h1">{session.subject}</Text>
          <SessionStatusChip status={session.status} />
        </View>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        <Card variant="raised">
          <View style={{ flexDirection: 'row', gap: theme.space[16] }}>
            <View style={{ flex: 1, gap: theme.space[4] }}><Text token="micro" color={theme.colors.textSecondary}>Duration</Text><Text token="h2" tabular>{session.durationMinutes} min</Text></View>
            <View style={{ flex: 1, gap: theme.space[4] }}><Text token="micro" color={theme.colors.textSecondary}>{charged ? 'Amount charged' : 'Session fee'}</Text><Text token="h2" tabular color={charged ? theme.colors.successText : theme.colors.textPrimary}>{formatPeso(session.sessionFee)}</Text></View>
          </View>
          {!charged ? <Text token="caption" color={theme.colors.textMuted} style={{ marginTop: theme.space[8] }}>This session is not included in earnings.</Text> : null}
        </Card>

        <View>
          <SectionHeader title="Details" />
          <Card variant="flat" padded={false}>
            <ListRow title="Student" subtitle={student?.nickname ?? 'Unknown student'} leading={<Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Date" subtitle={formatDisplayDate(session.startsAt)} leading={<Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Time" subtitle={`${formatDisplayTime(session.startsAt)}–${formatDisplayTime(session.endsAt)}`} leading={<Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Topic" subtitle={session.topicDetails || session.topicCategory.replaceAll('_', ' ')} leading={<Ionicons name="book-outline" size={18} color={theme.colors.textMuted} />} divider />
            <ListRow title="Rate" subtitle={`${formatPeso(session.appliedRate)} ${session.rateType === 'hourly' ? 'per hour' : 'per session'}`} leading={<Ionicons name="cash-outline" size={18} color={theme.colors.textMuted} />} />
          </Card>
        </View>

        {session.notes ? <View><SectionHeader title="Notes" /><Card variant="flat"><Text token="body">{session.notes}</Text></Card></View> : null}

        {session.status === 'rescheduled' && session.rescheduledToId ? <Button label="View replacement" icon="calendar-outline" onPress={() => router.push({ pathname: '/session-detail', params: { id: session.rescheduledToId! } } as never)} fullWidth /> : null}

        <View style={{ gap: theme.space[12] }}>
          {session.status !== 'rescheduled' ? <Button label="Edit session" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-edit', params: { id: session.id } } as never)} fullWidth /> : null}
          {session.status === 'scheduled' ? <Button label="Reschedule" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/session-new', params: { rescheduleFrom: session.id, studentId: session.studentId } } as never)} fullWidth /> : null}
          <Button label="Delete session" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmDelete} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
