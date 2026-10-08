import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Screen, SessionStatusChip, Text } from '@/components/ui';
import { RecordListCard, RecordListSummary } from '@/components/RecordList';
import { getStudent } from '@/services/students.service';
import { listSessions, SESSION_PAGE_SIZE, sessionErrorMessage } from '@/services/sessions.service';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme';
import type { Session, SessionStatus } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDateTime } from '@/utils/date';

const FILTERS: { value: SessionStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'student_absent', label: 'Absent' },
  { value: 'cancelled_by_parent', label: 'Parent cancelled' },
  { value: 'cancelled_by_tutor', label: 'I cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

export default function SessionsScreen() {
  const theme = useTheme();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const store = useSessionStore();
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  const hydrateNames = useCallback(async (sessions: Session[]) => {
    if (!profile) return;
    const ids = [...new Set(sessions.map((item) => item.studentId))];
    if (ids.length === 0) return;
    const students = await Promise.all(ids.map((id) => getStudent(profile.uid, id)));
    setStudentNames((current) => {
      const next = { ...current };
      students.forEach((student) => { if (student) next[student.id] = student.nickname; });
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
      await hydrateNames(page.items);
    } catch (error) {
      store.setError(sessionErrorMessage(error));
    } finally {
      store.setLoading(false);
    }
  // Zustand action references are stable; the full store object changes on every state update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, studentId, store.filter, hydrateNames]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

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
      await hydrateNames(page.items);
    } catch (error) {
      store.setError(sessionErrorMessage(error));
    } finally {
      store.setLoadingMore(false);
    }
  }

  const header = (
    <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[8], gap: theme.space[4] }}>
      <Text token="h1">{studentId ? 'Student sessions' : 'Sessions'}</Text>
      <Text token="caption" color={theme.colors.textMuted}>Review schedules, attendance, fees and completed tutoring work.</Text>
    </View>
  );

  return (
    <Screen header={header} padded={false}>
      <View style={{ flex: 1 }}>
        {store.items.length > 0 ? (
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[12] }}>
            <RecordListSummary
              icon="calendar-outline"
              label="SESSION HISTORY"
              value={`${store.items.length} loaded`}
              description={studentId ? 'Sessions recorded for this student.' : 'Your most recent tutoring sessions.'}
            />
          </View>
        ) : null}

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
          data={store.items}
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
            <RecordListCard
              icon="book-outline"
              iconTone={item.status === 'completed' ? 'success' : item.status === 'scheduled' ? 'info' : 'neutral'}
              title={item.subject}
              subtitle={`${studentNames[item.studentId] ?? 'Student'} · ${formatDisplayDateTime(item.startsAt)}`}
              amount={formatPesoCompact(item.sessionFee)}
              status={<SessionStatusChip status={item.status} />}
              tags={
                <>
                  <Chip variant="status" tone="neutral" label={`${item.durationMinutes} min`} icon="time-outline" />
                  <Chip variant="status" tone="info" label={item.topicCategory.replaceAll('_', ' ')} icon="bookmark-outline" />
                </>
              }
              actionLabel="View session"
              onPress={() => router.push({ pathname: '/session-detail', params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={store.loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="calendar-outline" title="No sessions recorded yet" description={studentId ? 'Add the first session for this student.' : 'Record a tutoring session to start building history.'} action={<Button label="Add session" onPress={() => router.push(`/session-new${studentId ? `?studentId=${studentId}` : ''}` as never)} />}/></Card>}
          ListFooterComponent={store.loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        />

        {store.items.length > 0 ? <View style={{ position: 'absolute', left: theme.layout.screenPadding, right: theme.layout.screenPadding, bottom: theme.space[16] }}><Button label="Add session" icon="add" onPress={() => router.push(`/session-new${studentId ? `?studentId=${studentId}` : ''}` as never)} fullWidth /></View> : null}
      </View>
    </Screen>
  );
}
