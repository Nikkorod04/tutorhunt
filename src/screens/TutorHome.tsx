/**
 * Tutor home — the reference screen for the design system.
 *
 * Built entirely from components/ui and theme tokens: no raw hex values, no
 * arbitrary spacing. It is the screen the rest of the app is measured against
 * (DESIGN_PLAN section 12).
 *
 * Financial figures come from the Phase 5 ledger. The layout, type scale and
 * elevation remain shared with the rest of the tutor experience.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PlanBadge,
  ProgressBar,
  SessionStatusChip,
  Screen,
  SectionHeader,
  StatTile,
  Text,
  TopAppBar,
  useToast,
} from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { activePlanFor, limitsFor } from '@/constants/plans';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { getDashboardSnapshot, type DashboardSnapshot } from '@/services/earnings.service';
import { listSessions, sessionErrorMessage, updateSessionStatus } from '@/services/sessions.service';
import { countActiveStudents, getStudentsByIds } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate, formatDisplayTime, manilaDayRange } from '@/utils/date';
import { formatSessionTimingHeading, getSessionTiming, sessionDisplayPriority } from '@/utils/session-presentation';

export function TutorHome() {
  const theme = useTheme();
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const activePlan = activePlanFor(entitlement);
  const limits = limitsFor(activePlan);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [studentsById, setStudentsById] = useState<Record<string, Student>>({});
  const [now, setNow] = useState(() => new Date());
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (!profile || profile.role !== 'tutor' || loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    try {
      const loadedNow = new Date();
      const { start: dayStart, end: dayEnd } = manilaDayRange(loadedNow);
      const [activeCount, todayPage, nextSnapshot] = await Promise.all([
        countActiveStudents(profile.uid),
        listSessions(profile.uid, {
          startsAtFrom: dayStart,
          startsAtTo: dayEnd,
          pageSize: 50,
          order: 'asc',
        }),
        getDashboardSnapshot(profile.uid, loadedNow),
      ]);

      const visibleTodaySessions = todayPage.items.slice(0, 5);
      const students = await getStudentsByIds(
        profile.uid,
        visibleTodaySessions.map((session) => session.studentId),
      );
      const nextStudents: Record<string, Student> = {};
      students.forEach((student) => { nextStudents[student.id] = student; });

      setActiveStudentCount(activeCount);
      setSnapshot(nextSnapshot);
      setStudentsById(nextStudents);
      setTodaySessions(
        visibleTodaySessions
          .sort((left, right) => {
            const priorityDifference = sessionDisplayPriority(left, loadedNow) - sessionDisplayPriority(right, loadedNow);
            return priorityDifference !== 0
              ? priorityDifference
              : left.startsAt.getTime() - right.startsAt.getTime();
          })
          .slice(0, 5),
      );
    } catch {
      // The rest of the dashboard remains useful when financial data is
      // temporarily unavailable; the full Earnings screen exposes errors.
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function markSessionCompleted(session: Session) {
    if (!profile || busySessionId || !beginSubmit()) return;
    setBusySessionId(session.id);
    try {
      await updateSessionStatus(profile.uid, session.id, 'completed');
      setTodaySessions((current) => current.map((item) => item.id === session.id ? { ...item, status: 'completed', billable: true } : item));
      showToast('Session marked completed', 'success');
    } catch (caught) {
      showToast(sessionErrorMessage(caught), 'danger');
    } finally {
      endSubmit();
      setBusySessionId(null);
    }
  }

  const firstName = (profile?.displayName ?? 'there').split(' ')[0];
  const pdfsUsed = entitlement?.pdfStatementsThisMonth ?? 0;
  const orderedTodaySessions = [...todaySessions].sort((left, right) => {
    const priorityDifference = sessionDisplayPriority(left, now) - sessionDisplayPriority(right, now);
    return priorityDifference !== 0
      ? priorityDifference
      : left.startsAt.getTime() - right.startsAt.getTime();
  });
  const focusSession = orderedTodaySessions.find((session) => {
    const kind = getSessionTiming(session, now).kind;
    return kind === 'upcoming' || kind === 'ongoing' || kind === 'overdue';
  });

  return (
    <Screen
      scroll
      padded
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadDashboard()}
          tintColor={theme.colors.primary}
        />
      )}
      header={<TopAppBar title="Home" action={<NotificationBell />} />}
    >
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        {/* Compact welcome row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space[12],
          }}
        >
          <Avatar name={profile?.displayName ?? ''} size="md" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text token="h3">
              Good morning, {firstName}
            </Text>
            <Text token="caption" color={theme.colors.textMuted}>
              {formatDisplayDate(now)}
            </Text>
          </View>
          <PlanBadge plan={activePlan} />
        </View>

        {/* One clear priority: the nearest session */}
        {focusSession ? (
          <NextSessionCard
            session={focusSession}
            student={studentsById[focusSession.studentId]}
            now={now}
            onPress={() => router.push({ pathname: '/session-detail', params: { id: focusSession.id } } as never)}
            onMarkCompleted={() => void markSessionCompleted(focusSession)}
            busy={busySessionId === focusSession.id}
          />
        ) : (
          <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
            <EmptyState
              icon="calendar-outline"
              title="Your day is open"
              description="Add a session when you are ready to plan your next lesson."
              action={<Button label="Add session" icon="add" size="sm" onPress={() => router.push('/session-new' as never)} />}
            />
          </Card>
        )}

        {/* Fast scan metrics */}
        <View>
          <SectionHeader title="Today at a glance" />
          <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
            <MiniMetric icon="calendar-outline" value={todaySessions.length} label="Sessions" tone="primary" />
            <MiniMetric icon="people-outline" value={activeStudentCount} label="Students" tone="success" />
            <MiniMetric icon="trending-up-outline" value={snapshot?.grossSessionEarnings ?? 0} label="Earned" tone="success" money />
          </View>
        </View>

        {/* Most-used actions */}
        <View>
          <SectionHeader title="Quick actions" />
          <View style={{ gap: theme.space[8] }}>
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <QuickAction icon="person-add-outline" label="Add student" onPress={() => router.push('/student-new' as never)} />
              <QuickAction icon="calendar-outline" label="Add session" onPress={() => router.push('/session-new' as never)} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <QuickAction icon="card-outline" label="Record payment" onPress={() => router.push('/payment-new' as never)} />
              <QuickAction icon="wallet-outline" label="Add expense" onPress={() => router.push('/expense-new' as never)} />
            </View>
          </View>
        </View>

        {/* Compact monthly summary */}
        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <SectionHeader title="This month" />
            <StatTile
              label="Gross earnings"
              value={snapshot?.grossSessionEarnings ?? 0}
              variant="hero"
              animate
            />
            <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
              <View style={{ flex: 1 }}>
                <Text token="caption" color={theme.colors.textMuted}>Sessions</Text>
                <Text token="h3" tabular>{snapshot?.sessionCount ?? 0}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text token="caption" color={theme.colors.textMuted}>Teaching hours</Text>
                <Text token="h3" tabular>{formatHours(snapshot?.tutoringMinutes ?? 0)}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Today's sessions */}
        <View>
          <SectionHeader title="Today's sessions" action={<Button label="View all" variant="ghost" size="sm" onPress={() => router.push('/sessions' as never)} />} />
          {todaySessions.length === 0 ? (
            <Card variant="flat">
              <EmptyState icon="calendar-outline" title="Nothing scheduled today" description="Your scheduled sessions will appear here." />
            </Card>
          ) : (
            <View style={{ gap: theme.space[12] }}>
              {orderedTodaySessions.map((session) => (
                <TodaySessionCard
                  key={session.id}
                  session={session}
                  student={studentsById[session.studentId]}
                  now={now}
                  busy={busySessionId === session.id}
                  onMarkCompleted={() => void markSessionCompleted(session)}
                  onPress={() => router.push({ pathname: '/session-detail', params: { id: session.id } } as never)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Free-plan awareness, shown only when it is relevant */}
        {limits.maxActiveStudents !== Number.POSITIVE_INFINITY ? (
          <Card variant="accent" padded={false}>
            <View style={{ padding: theme.space[12], gap: theme.space[8] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
                <Text token="h3" color={theme.colors.warningText}>Free plan limits</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
                <View style={{ flex: 1, gap: theme.space[8] }}>
                  <Text token="caption" color={theme.colors.warningText}>{`${activeStudentCount} of ${limits.maxActiveStudents} active students · ${pdfsUsed} of ${limits.monthlyPdfs} statements used`}</Text>
                  <ProgressBar value={limits.monthlyPdfs > 0 ? Math.min(1, pdfsUsed / limits.monthlyPdfs) : 0} variant="quota" />
                </View>
                <Button label="Go Pro" variant="accent" size="sm" onPress={() => router.push('/upgrade' as never)} />
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function MiniMetric({
  icon,
  value,
  label,
  tone,
  money = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  tone: 'primary' | 'success' | 'danger';
  money?: boolean;
}) {
  const theme = useTheme();
  const toneSet = tone === 'primary'
    ? { foreground: theme.colors.primary, background: theme.colors.primarySubtle }
    : tone === 'success'
      ? { foreground: theme.colors.successText, background: theme.colors.successSubtle }
      : { foreground: theme.colors.dangerText, background: theme.colors.dangerSubtle };

  return (
    <Card variant="flat" style={{ flex: 1, padding: theme.space[12] }}>
      <View style={{ gap: theme.space[8] }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: toneSet.background }}>
          <Ionicons name={icon} size={16} color={toneSet.foreground} />
        </View>
        <Text token="h3" tabular numberOfLines={1}>{money ? formatPesoCompact(value) : String(Math.round(value))}</Text>
        <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{label}</Text>
      </View>
    </Card>
  );
}

function formatHours(minutes: number): string {
  const hours = Math.max(0, minutes) / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 76,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space[8],
        paddingHorizontal: theme.space[8],
        borderRadius: theme.radius.lg,
        borderWidth: 0.5,
        borderColor: theme.colors.borderSubtle,
        backgroundColor: pressed ? theme.colors.primarySubtle : theme.colors.surface,
        ...theme.elevation.e1,
      })}
    >
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text token="caption" align="center" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function NextSessionCard({
  session,
  student,
  now,
  onPress,
  onMarkCompleted,
  busy,
}: {
  session: Session;
  student?: Student;
  now: Date;
  onPress: () => void;
  onMarkCompleted: () => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const timing = getSessionTiming(session, now);
  const isOverdue = timing.kind === 'overdue';
  const isOngoing = timing.kind === 'ongoing';
  const timingColor = isOverdue ? theme.colors.dangerText : isOngoing ? theme.colors.successText : theme.colors.primary;
  const eyebrow = isOverdue ? 'NEEDS ATTENTION' : isOngoing ? 'HAPPENING NOW' : 'NEXT SESSION';

  return (
    <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: isOverdue ? theme.colors.dangerBorder : theme.colors.primaryBorder }}>
      <View style={{ gap: theme.space[16] }}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${student?.nickname ?? 'student'} session`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="micro" color={timingColor}>{eyebrow}</Text>
              <Text token="display" color={timingColor} tabular>{timing.label}</Text>
              <Text token="body" color={theme.colors.textSecondary} numberOfLines={1}>
                {student?.tutoringPlace?.trim() ?? 'Scheduled tutoring session'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={timingColor} />
          </View>

          <View style={{ height: 0.5, backgroundColor: theme.colors.primaryBorder, marginVertical: theme.space[12] }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <Avatar
              name={student?.nickname ?? 'Student'}
              imageUrl={student?.avatarType === 'custom' ? student.customAvatarUrl : null}
              builtin={student?.avatarType === 'custom' ? 'default' : student?.avatarType}
              size="sm"
            />
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Text token="h3" numberOfLines={1}>{student?.nickname ?? 'Student'}</Text>
              <Text token="caption" color={theme.colors.textMuted}>{formatDisplayTime(session.startsAt)} – {formatDisplayTime(session.endsAt)}</Text>
              <Text token="caption" color={theme.colors.textSecondary} numberOfLines={1}>{session.subject}</Text>
            </View>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
          <View style={{ flex: 1 }}>
            <Button label="Open session" size="sm" onPress={onPress} fullWidth />
          </View>
          {isOverdue ? (
            <View style={{ flex: 1 }}>
              <Button label="Mark completed" size="sm" variant="secondary" loading={busy} onPress={onMarkCompleted} fullWidth />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function TodaySessionCard({
  session,
  student,
  now,
  busy,
  onMarkCompleted,
  onPress,
}: {
  session: Session;
  student?: Student;
  now: Date;
  busy: boolean;
  onMarkCompleted: () => void;
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
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${student?.nickname ?? 'student'} session`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.space[8] }}>
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Text token="h3" color={timingColor}>{formatSessionTimingHeading(timing, student?.tutoringPlace)}</Text>
              {isOverdue ? <Text token="caption" color={theme.colors.dangerText}>Mark it completed or reschedule to keep your records up to date.</Text> : null}
            </View>
            <SessionStatusChip status={session.status} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12], marginTop: theme.space[12] }}>
            <Avatar
              name={student?.nickname ?? 'Student'}
              imageUrl={student?.avatarType === 'custom' ? student.customAvatarUrl : null}
              builtin={student?.avatarType === 'custom' ? 'default' : student?.avatarType}
              size="sm"
            />
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Text token="h3" numberOfLines={1}>{student?.nickname ?? 'Student'}</Text>
              <Text token="caption" color={theme.colors.textMuted}>{formatDisplayTime(session.startsAt)} – {formatDisplayTime(session.endsAt)}</Text>
              <Text token="caption" color={theme.colors.textSecondary} numberOfLines={1}>{session.subject}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textHint} />
          </View>
        </Pressable>

        {isOverdue ? (
          <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
            <View style={{ flex: 1 }}><Button label="Mark completed" size="sm" loading={busy} onPress={onMarkCompleted} fullWidth /></View>
            <View style={{ flex: 1 }}><Button label="Reschedule" size="sm" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/session-new', params: { sessionId: session.id } } as never)} fullWidth /></View>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
