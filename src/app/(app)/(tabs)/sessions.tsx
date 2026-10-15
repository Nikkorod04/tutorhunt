import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Avatar, Button, Card, Chip, EmptyState, Screen, SessionStatusChip, Text, TopAppBar, useToast } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { getStudentsByIds } from '@/services/students.service';
import { listSessions, SESSION_PAGE_SIZE, sessionErrorMessage, updateSessionStatus } from '@/services/sessions.service';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme';
import type { Session, SessionStatus, Student } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate, formatDisplayTime } from '@/utils/date';
import { compareSessionsForDisplay, formatSessionTimingHeading, getSessionTiming } from '@/utils/session-presentation';

const FILTERS: { value: SessionStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'student_absent', label: 'Absent' },
  { value: 'cancelled_by_parent', label: 'Parent cancelled' },
  { value: 'cancelled_by_tutor', label: 'I cancelled' },
];

export default function SessionsScreen() {
  const theme = useTheme();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const store = useSessionStore();
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
  const [studentsById, setStudentsById] = useState<Record<string, Student>>({});
  const [now, setNow] = useState(() => new Date());
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const hydrateStudents = useCallback(async (sessions: Session[]) => {
    if (!profile) return;
    const ids = [...new Set(sessions.map((item) => item.studentId))];
    if (ids.length === 0) return;
    const students = await getStudentsByIds(profile.uid, ids);
    setStudentsById((current) => {
      const next = { ...current };
      students.forEach((student) => { next[student.id] = student; });
      return next;
    });
  }, [profile]);

  const loadFirst = useCallback(async () => {
    if (!profile) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const page = await listSessions(profile.uid, {
        studentId,
        status: store.filter,
        pageSize: SESSION_PAGE_SIZE,
      });
      store.setPage(page);
      await hydrateStudents(page.items);
    } catch (error) {
      store.setError(sessionErrorMessage(error));
    } finally {
      store.setLoading(false);
    }
  // Zustand action references are stable; the full store object changes on every state update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, studentId, store.filter, hydrateStudents]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!profile || !store.cursor || !store.hasMore || store.loadingMore) return;
    store.setLoadingMore(true);
    try {
      const page = await listSessions(profile.uid, {
        studentId,
        status: store.filter,
        pageSize: SESSION_PAGE_SIZE,
        cursor: store.cursor,
      });
      store.appendPage(page);
      await hydrateStudents(page.items);
    } catch (error) {
      store.setError(sessionErrorMessage(error));
    } finally {
      store.setLoadingMore(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function markSessionCompleted(session: Session) {
    if (!profile || busySessionId || !beginSubmit()) return;
    setBusySessionId(session.id);
    try {
      await updateSessionStatus(profile.uid, session.id, 'completed');
      if (store.filter === 'scheduled') {
        store.remove(session.id);
      } else {
        store.upsert({ ...session, status: 'completed', billable: true, updatedAt: new Date() });
      }
      showToast('Session marked completed', 'success');
    } catch (error) {
      const message = sessionErrorMessage(error);
      store.setError(message);
      showToast(message, 'danger');
    } finally {
      endSubmit();
      setBusySessionId(null);
    }
  }

  const visibleItems = [...store.items].sort((left, right) => compareSessionsForDisplay(left, right, now));

  const header = (
    <TopAppBar title={studentId ? 'Student sessions' : 'Sessions'} action={<NotificationBell />} />
  );

  return (
    <Screen header={header} padded={false}>
      <View style={{ flex: 1 }}>
        <ScrollView
          horizontal
          style={{ flexGrow: 0, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space[8], paddingHorizontal: theme.layout.screenPadding, paddingVertical: theme.space[12] }}
        >
          {FILTERS.map((item) => <Chip key={item.label} label={item.label} variant="filter" selected={store.filter === item.value} onPress={() => store.setFilter(item.value)} />)}
        </ScrollView>

        {store.error ? <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[12] }}><Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{store.error}</Text></Card></View> : null}

        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-start',
            paddingHorizontal: theme.layout.screenPadding,
            paddingBottom: theme.space[64] + theme.space[16],
            gap: theme.space[8],
          }}
          refreshControl={<RefreshControl refreshing={store.loading && store.items.length > 0} onRefresh={loadFirst} tintColor={theme.colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => (
            <SessionListCard
              session={item}
              student={studentsById[item.studentId]}
              now={now}
              busy={busySessionId === item.id}
              onMarkCompleted={() => void markSessionCompleted(item)}
              onReschedule={() => router.push({ pathname: '/session-new', params: { sessionId: item.id } } as never)}
              onPress={() => router.push({ pathname: '/session-detail', params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={store.loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="calendar-outline" title="No sessions recorded yet" description={studentId ? 'Add the first session for this student.' : 'Record a tutoring session to start building history.'} /></Card>}
          ListFooterComponent={store.loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: theme.space[16],
            paddingHorizontal: theme.layout.screenPadding,
            alignItems: 'flex-end',
          }}
        >
          <Pressable
            onPress={() => router.push(`/session-new${studentId ? `?studentId=${studentId}` : ''}` as never)}
            accessibilityRole="button"
            accessibilityLabel="Add session"
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.82 : 1,
              elevation: 4,
              shadowColor: theme.colors.textPrimary,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            })}
          >
            <Ionicons name="add" size={28} color={theme.colors.textOnPrimary} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function SessionListCard({
  session,
  student,
  now,
  busy,
  onMarkCompleted,
  onReschedule,
  onPress,
}: {
  session: Session;
  student?: Student;
  now: Date;
  busy: boolean;
  onMarkCompleted: () => void;
  onReschedule: () => void;
  onPress: () => void;
}) {
  const theme = useTheme();
  const timing = getSessionTiming(session, now);
  const isOverdue = timing.kind === 'overdue';
  const isOngoing = timing.kind === 'ongoing';
  const timingColor = isOverdue ? theme.colors.dangerText : isOngoing ? theme.colors.successText : theme.colors.primary;

  return (
    <Card
      variant="raised"
      style={isOverdue ? { backgroundColor: theme.colors.dangerSubtle, borderColor: theme.colors.dangerBorder } : undefined}
    >
      <View style={{ gap: theme.space[12] }}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${session.subject} session`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
            <Avatar
              name={student?.nickname ?? 'Student'}
              imageUrl={student?.avatarType === 'custom' ? student.customAvatarUrl : null}
              builtin={student?.avatarType === 'custom' ? 'default' : student?.avatarType}
              size="sm"
            />
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="h3" color={timingColor} numberOfLines={2}>{formatSessionTimingHeading(timing, student?.tutoringPlace)}</Text>
              <Text token="bodyStrong" numberOfLines={1}>{student?.nickname ?? 'Student'}</Text>
              <Text token="caption" color={theme.colors.textMuted} numberOfLines={2}>
                {`${formatDisplayDate(session.startsAt)} · ${formatDisplayTime(session.startsAt)} – ${formatDisplayTime(session.endsAt)}`}
              </Text>
              <Text token="caption" color={theme.colors.textSecondary} numberOfLines={1}>{session.subject}</Text>
            </View>
            <SessionStatusChip status={session.status} />
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
          <Chip variant="status" tone="neutral" label={`${session.durationMinutes} min`} icon="time-outline" />
          <Chip variant="status" tone="info" label={session.topicCategory.replaceAll('_', ' ')} icon="bookmark-outline" />
          <Chip variant="status" tone="neutral" label={formatPesoCompact(session.sessionFee)} icon="cash-outline" />
        </View>

        {isOverdue ? (
          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.dangerText}>Mark it completed or reschedule to keep your records up to date.</Text>
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View style={{ flex: 1 }}><Button label="Mark completed" size="sm" loading={busy} onPress={onMarkCompleted} fullWidth /></View>
              <View style={{ flex: 1 }}><Button label="Reschedule" size="sm" variant="secondary" disabled={busy} onPress={onReschedule} fullWidth /></View>
            </View>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
