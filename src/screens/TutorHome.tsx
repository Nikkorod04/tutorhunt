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
import { Image, View } from 'react-native';

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
} from '@/components/ui';
import type { IconName } from '@/components/ui';
import { RecordListCard } from '@/components/RecordList';
import { activePlanFor, limitsFor } from '@/constants/plans';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { getEarningsSnapshot, type EarningsSnapshot } from '@/services/earnings.service';
import { listSessions } from '@/services/sessions.service';
import { countActiveStudents, listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';
import { formatDisplayTime, formatIsoDate } from '@/utils/date';

interface QuickAction {
  icon: IconName;
  label: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'person-add-outline', label: 'Add student', route: '/students' },
  { icon: 'add-circle-outline', label: 'Add session', route: '/sessions' },
  { icon: 'wallet-outline', label: 'Add expense', route: '/expense-new' },
  { icon: 'document-text-outline', label: 'Generate statement', route: '/statement-new' },
  { icon: 'repeat-outline', label: 'Recurring sessions', route: '/recurring' },
  { icon: 'search-outline', label: 'Tutor Hunt', route: '/parent-requests' },
];

export function TutorHome() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const activePlan = activePlanFor(entitlement);
  const limits = limitsFor(activePlan);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [snapshot, setSnapshot] = useState<EarningsSnapshot | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

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
      const names: Record<string, string> = {};
      studentsPage.items.forEach((student: Student) => { names[student.id] = student.nickname; });
      setStudentNames(names);
      const today = formatIsoDate(new Date());
      setTodaySessions(sessionsPage.items.filter((session) => formatIsoDate(session.startsAt) === today).slice(0, 3));
    } catch {
      // The rest of the dashboard remains useful when financial data is
      // temporarily unavailable; the full Earnings screen exposes errors.
    }
  }, [profile]);

  useEffect(() => { void loadFinancials(); }, [loadFinancials]);

  const firstName = (profile?.displayName ?? 'there').split(' ')[0];
  const pdfsUsed = entitlement?.pdfStatementsThisMonth ?? 0;

  return (
    <Screen scroll padded>
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

        {/* Quick actions */}
        <View>
          <SectionHeader title="Record activity" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[12] }}>
            {QUICK_ACTIONS.slice(0, 2).map((action) => (
              <Card key={action.label} variant="interactive" onPress={() => router.push(action.route as never)} accessibilityLabel={action.label} style={{ flexBasis: '47%', flexGrow: 1 }}>
                <View style={{ gap: theme.space[8] }}>
                  <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={action.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <Text token="bodyStrong">{action.label}</Text>
                </View>
              </Card>
            ))}
          </View>
          <View style={{ marginTop: theme.space[12], flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[12] }}>
            {QUICK_ACTIONS.slice(2).map((action) => (
              <Card key={action.label} variant="interactive" onPress={() => router.push(action.route as never)} accessibilityLabel={action.label} style={{ flexBasis: '30%', flexGrow: 1 }}>
                <View style={{ gap: theme.space[8] }}>
                  <Ionicons name={action.icon} size={20} color={theme.colors.primary} />
                  <Text token="caption">{action.label}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Today's sessions */}
        <View>
          <SectionHeader title="Today's sessions" action={<Button label="View all" variant="ghost" size="sm" onPress={() => router.push('/sessions' as never)} />} />
          {todaySessions.length === 0 ? (
            <Card variant="flat">
              <EmptyState icon="calendar-outline" title="Nothing scheduled today" description="Add a session to keep your day organized." action={<Button label="Add session" variant="secondary" size="sm" onPress={() => router.push('/session-new' as never)} />} />
            </Card>
          ) : (
            <View style={{ gap: theme.space[12] }}>
              {todaySessions.map((session) => (
                <RecordListCard
                  key={session.id}
                  icon="calendar-outline"
                  iconTone={session.status === 'completed' ? 'success' : 'info'}
                  title={session.subject}
                  subtitle={`${formatDisplayTime(session.startsAt)} · ${studentNames[session.studentId] ?? 'Student'}`}
                  amount={`₱${session.sessionFee.toFixed(2)}`}
                  status={<SessionStatusChip status={session.status} />}
                  actionLabel="View session"
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
