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
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

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
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { getEarningsSnapshot, type EarningsSnapshot } from '@/services/earnings.service';
import { listSessions, sessionErrorMessage, updateSessionStatus } from '@/services/sessions.service';
import { countActiveStudents, listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';
import { formatDisplayTime, formatIsoDate } from '@/utils/date';
import { formatSessionTimingHeading, getSessionTiming, sessionDisplayPriority } from '@/utils/session-presentation';

export function TutorHome() {
  const theme = useTheme();
  const { showToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const activePlan = activePlanFor(entitlement);
  const limits = limitsFor(activePlan);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [snapshot, setSnapshot] = useState<EarningsSnapshot | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [studentsById, setStudentsById] = useState<Record<string, Student>>({});
  const [now, setNow] = useState(() => new Date());
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const loadFinancials = useCallback(async () => {
    if (!profile || profile.role !== 'tutor') return;
    try {
      const [studentsPage, activeCount, sessionsPage] = await Promise.all([
        listStudents(profile.uid, { pageSize: 100 }),
        countActiveStudents(profile.uid),
        listSessions(profile.uid, { pageSize: 50 }),
      ]);
      const nextSnapshot = await getEarningsSnapshot(profile.uid, new Date(), studentsPage.items);
      setActiveStudentCount(activeCount);
      setSnapshot(nextSnapshot);
      const nextStudents: Record<string, Student> = {};
      studentsPage.items.forEach((student: Student) => { nextStudents[student.id] = student; });
      setStudentsById(nextStudents);
      const loadedNow = new Date();
      const today = formatIsoDate(loadedNow);
      setTodaySessions(
        sessionsPage.items
          .filter((session) => formatIsoDate(session.startsAt) === today)
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
    }
  }, [profile]);

  useEffect(() => { void loadFinancials(); }, [loadFinancials]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function markSessionCompleted(session: Session) {
    if (!profile || busySessionId) return;
    setBusySessionId(session.id);
    try {
      await updateSessionStatus(profile.uid, session.id, 'completed');
      setTodaySessions((current) => current.map((item) => item.id === session.id ? { ...item, status: 'completed', billable: true } : item));
      showToast('Session marked completed', 'success');
    } catch (caught) {
      showToast(sessionErrorMessage(caught), 'danger');
    } finally {
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

  return (
    <Screen scroll padded header={<TopAppBar title="Home" action={<NotificationBell />} />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        {/* Greeting */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space[12],
          }}
        >
          <Avatar name={profile?.displayName ?? ''} size="md" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text token="caption" color={theme.colors.textMuted}>
              Good to see you
            </Text>
            <Text token="h2">{firstName}</Text>
          </View>
          <PlanBadge plan={activePlan} />
        </View>

        {/* Hero: the one large figure on this screen */}
        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
          <View style={{ gap: theme.space[16] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="micro" color={theme.colors.primary}>THIS MONTH</Text>
                <Text token="h3">Your tutoring snapshot</Text>
                <Text token="caption" color={theme.colors.textSecondary}>Keep your sessions, income and students moving forward.</Text>
              </View>
              <Image source={ILLUSTRATIONS.tutoring} style={{ width: 74, height: 74 }} resizeMode="contain" />
            </View>
            <StatTile
              label="Gross earnings"
              value={snapshot?.grossSessionEarnings ?? 0}
              variant="hero"
              animate
            />

            <View style={{ height: 0.5, backgroundColor: theme.colors.primaryBorder }} />

            <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
              <View style={{ flex: 1 }}>
                <StatTile label="Sessions" value={snapshot?.sessionCount ?? 0} format={(n) => String(Math.round(n))} />
              </View>
              <View style={{ flex: 1 }}>
                <StatTile label="Outstanding" value={snapshot?.outstanding ?? 0} />
              </View>
            </View>
          </View>
        </Card>

        {/* Activity summary */}
        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <SectionHeader title="At a glance" />
            <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
              <View style={{ flex: 1 }}><StatTile label="Active students" value={activeStudentCount} format={(value) => String(Math.round(value))} /></View>
              <View style={{ flex: 1 }}><StatTile label="Payments received" value={snapshot?.paymentsReceived ?? 0} /></View>
              <View style={{ flex: 1 }}><StatTile label="Net cash" value={snapshot?.netIncome ?? 0} /></View>
            </View>
          </View>
        </Card>

        {/* Today's sessions */}
        <View>
          <SectionHeader title="Today's sessions" action={<Button label="View all" variant="ghost" size="sm" onPress={() => router.push('/sessions' as never)} />} />
          {todaySessions.length === 0 ? (
            <Card variant="flat">
              <EmptyState icon="calendar-outline" title="Nothing scheduled today" description="Add a session to keep your day organized." action={<Button label="Add session" variant="secondary" size="sm" onPress={() => router.push('/session-new' as never)} />} />
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
          <Card variant="accent">
            <View style={{ gap: theme.space[12] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
                <Text token="h3" color={theme.colors.warningText}>Free plan</Text>
              </View>
              <Text token="caption" color={theme.colors.warningText}>{`Up to ${limits.maxActiveStudents} active students and ${limits.monthlyPdfs} statements a month.`}</Text>
              <View style={{ gap: theme.space[8] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text token="micro" color={theme.colors.warningText}>STATEMENTS USED</Text>
                  <Text token="caption" tabular color={theme.colors.warningText}>{`${pdfsUsed} of ${limits.monthlyPdfs}`}</Text>
                </View>
                <ProgressBar value={limits.monthlyPdfs > 0 ? Math.min(1, pdfsUsed / limits.monthlyPdfs) : 0} variant="quota" />
              </View>
              <Button label="View Pro plans" variant="accent" size="sm" onPress={() => router.push('/upgrade' as never)} />
            </View>
          </Card>
        ) : null}

        <Text token="caption" color={theme.colors.textHint} align="center">
          {`${activeStudentCount} active student${activeStudentCount === 1 ? '' : 's'} · Gross earnings are based on billable sessions.`}
        </Text>
      </View>
    </Screen>
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
            <View style={{ flex: 1 }}><Button label="Reschedule" size="sm" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/session-new', params: { rescheduleFrom: session.id, studentId: session.studentId } } as never)} fullWidth /></View>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
