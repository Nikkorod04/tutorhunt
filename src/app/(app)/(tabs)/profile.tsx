/**
 * Profile and settings.
 *
 * This screen carries real data in Phase 1: the signed-in identity, the role
 * and the entitlement. It is the one place the plan and the PDF quota are
 * visible, so it is also where the entitlement cache is re-read.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ListRow,
  PlanBadge,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { activePlanFor, limitsFor } from '@/constants/plans';
import { ensureEntitlement } from '@/services/entitlements.service';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const setEntitlement = useAuthStore((state) => state.setEntitlement);
  const [busy, setBusy] = useState(false);

  const activePlan = activePlanFor(entitlement);
  const limits = limitsFor(activePlan);
  const isUnlimited = !Number.isFinite(limits.monthlyPdfs);
  const used = entitlement?.pdfStatementsThisMonth ?? 0;
  const quotaRatio = isUnlimited ? 0 : Math.min(1, used / limits.monthlyPdfs);

  async function handleRefresh() {
    if (!profile) return;
    setBusy(true);
    try {
      const fresh = await ensureEntitlement(profile.uid);
      setEntitlement(fresh);
    } catch {
      Alert.alert('Could not refresh', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen scroll padded>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <Avatar name={profile?.displayName ?? ''} size="lg" />
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="h2" numberOfLines={1}>
                {profile?.displayName || 'Your account'}
              </Text>
              <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>
                {profile?.email ?? ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                {profile?.role ? <Chip variant="status" tone="info" label={profile.role} /> : null}
                <PlanBadge plan={activePlan} />
              </View>
            </View>
          </View>
        </Card>

        {profile?.role === 'tutor' ? (
          <Card variant={activePlan === 'pro' ? 'raised' : 'premium'}>
            <View style={{ gap: theme.space[12] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                <Ionicons name="star" size={20} color={theme.colors.premium} />
                <Text token="h3">{activePlan === 'pro' ? 'Pro plan' : 'Unlock Tutor Hunt Pro'}</Text>
              </View>
              <Text token="caption" color={theme.colors.textMuted}>
                {activePlan === 'pro'
                  ? 'Manage your Pro access and view the included features.'
                  : 'Unlimited students, recurring sessions, statements and more.'}
              </Text>
              <Button
                label={activePlan === 'pro' ? 'View Pro details' : 'Upgrade to Pro'}
                variant={activePlan === 'pro' ? 'secondary' : 'accent'}
                onPress={() => router.push('/upgrade' as never)}
                fullWidth
              />
            </View>
          </Card>
        ) : null}

        {profile?.role === 'tutor' ? (
          <Card variant="raised">
            <View style={{ gap: theme.space[12] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text token="micro" color={theme.colors.textSecondary}>
                  Statements this month
                </Text>
                <Text token="caption" tabular>
                  {isUnlimited ? `${used} · unlimited` : `${used} of ${limits.monthlyPdfs}`}
                </Text>
              </View>

              <ProgressBar value={quotaRatio} variant="quota" />

              <Text token="caption" color={theme.colors.textMuted}>
                {isUnlimited
                  ? 'Pro: no monthly limit on statements.'
                  : `Free plan resets on the 1st. Pro removes the limit.`}
              </Text>

              <Button
                label="Refresh entitlement"
                variant="secondary"
                size="sm"
                loading={busy}
                onPress={handleRefresh}
              />
            </View>
          </Card>
        ) : null}

        <View>
          <SectionHeader title="Account" />
          <Card variant="flat" padded={false}>
            <ListRow
              title="Role"
              subtitle={profile?.role === 'parent' ? 'Parent' : 'Tutor'}
              leading={
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
                  <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
                </View>
              }
              trailing={
                <Badge variant="count" tone="neutral" label="Locked" />
              }
              divider
            />
            <ListRow
              title="Notifications"
              subtitle="Arrives with reminders in a later phase"
              leading={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surfaceSunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="notifications-outline" size={18} color={theme.colors.textMuted} />
                </View>
              }
              showChevron
            />
            <ListRow
              title="Expenses"
              subtitle="Track tutoring costs"
              leading={
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
                  <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
                </View>
              }
              showChevron
              onPress={() => router.push('/expenses' as never)}
            />
            {profile?.role === 'parent' ? (
              <ListRow
                title="Parent profile"
                subtitle="Set your city and contact preference"
                leading={
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
                    <Ionicons name="home-outline" size={18} color={theme.colors.primary} />
                  </View>
                }
                divider
                showChevron
                onPress={() => router.push('/parent-profile-edit' as never)}
              />
            ) : null}
            {profile?.role === 'tutor' ? (
              <>
                <ListRow
                  title="Recurring sessions"
                  subtitle="Create and manage weekly session series"
                  leading={
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
                      <Ionicons name="repeat-outline" size={18} color={theme.colors.primary} />
                    </View>
                  }
                  divider
                  showChevron
                  onPress={() => router.push('/recurring' as never)}
                />
                <ListRow
                  title="Public profile"
                  subtitle="Set what parents can see about you"
                  leading={
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
                      <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
                    </View>
                  }
                  divider
                  showChevron
                  onPress={() => router.push('/tutor-profile-edit' as never)}
                />
                <ListRow
                  title="Payments"
                  subtitle="Record payments and view payment history"
                  leading={
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
                      <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                    </View>
                  }
                  divider
                  showChevron
                  onPress={() => router.push('/payments' as never)}
                />
                <ListRow
                  title="Earnings"
                  subtitle="Monthly income and student balances"
                  leading={
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
                      <Ionicons name="trending-up-outline" size={18} color={theme.colors.primary} />
                    </View>
                  }
                  showChevron
                  onPress={() => router.push('/earnings' as never)}
                />
                <ListRow
                  title="Statements"
                  subtitle="Generate and view parent statements"
                  leading={
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
                      <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                    </View>
                  }
                  showChevron
                  onPress={() => router.push('/statements' as never)}
                />
              </>
            ) : null}
          </Card>
        </View>

        <Button label="Sign out" variant="destructive" onPress={handleSignOut} fullWidth />
      </View>
    </Screen>
  );
}
