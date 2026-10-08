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
import { Pressable, View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  PlanBadge,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import type { IconName } from '@/components/ui';
import { limitsFor } from '@/constants/plans';
import { getEarningsSnapshot, type EarningsSnapshot } from '@/services/earnings.service';
import { countActiveStudents, listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

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
];

export function TutorHome() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const limits = limitsFor(entitlement?.plan);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [snapshot, setSnapshot] = useState<EarningsSnapshot | null>(null);

  const loadFinancials = useCallback(async () => {
    if (!profile || profile.role !== 'tutor') return;
    try {
      const [studentsPage, activeCount] = await Promise.all([
        listStudents(profile.uid, { pageSize: 100 }),
        countActiveStudents(profile.uid),
      ]);
      const nextSnapshot = await getEarningsSnapshot(profile.uid, new Date(), studentsPage.items);
      setActiveStudentCount(activeCount);
      setSnapshot(nextSnapshot);
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
          <PlanBadge plan={entitlement?.plan ?? 'free'} />
        </View>

        {/* Hero: the one large figure on this screen */}
        <Card variant="raised">
          <View style={{ gap: theme.space[16] }}>
            <StatTile
              label="Earnings this month"
              value={snapshot?.grossSessionEarnings ?? 0}
              variant="hero"
              animate
            />

            <View
              style={{
                height: 0.5,
                backgroundColor: theme.colors.borderSubtle,
              }}
            />

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

        {/* Quick actions */}
        <View>
          <SectionHeader title="Quick actions" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[12] }}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as never)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  gap: theme.space[8],
                  padding: theme.space[16],
                  borderRadius: theme.radius.lg,
                  borderWidth: 0.5,
                  borderColor: theme.colors.borderSubtle,
                  backgroundColor: theme.colors.surface,
                  ...theme.elevation.e1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={action.icon} size={18} color={theme.colors.primary} />
                </View>
                <Text token="caption">{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Today's sessions */}
        <View>
          <SectionHeader title="Today's sessions" />
          <Card variant="flat">
            <EmptyState
              icon="calendar-outline"
              title="Nothing scheduled today"
              description="Sessions you record will show up here."
            />
          </Card>
        </View>

        {/* Free-plan awareness, shown only when it is relevant */}
        {limits.maxActiveStudents !== Number.POSITIVE_INFINITY ? (
          <Card variant="accent">
            <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text token="caption" color={theme.colors.warningText}>
                  Free plan
                </Text>
                <Text token="caption" color={theme.colors.warningText}>
                  {`Up to ${limits.maxActiveStudents} active students and ${limits.monthlyPdfs} statements a month. `}
                  {`Used ${pdfsUsed} of ${limits.monthlyPdfs} this month.`}
                </Text>
              </View>
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
