import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Image, View } from 'react-native';

import { Button, Card, Chip, PlanBadge, Screen, Text } from '@/components/ui';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { OWNER_CONTACT } from '@/constants/owner';
import { activePlanFor, PRICING } from '@/constants/plans';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { formatPeso, formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

const PRO_FEATURES = [
  { label: 'Unlimited active students', icon: 'people-outline' as const },
  { label: 'Unlimited PDF statements', icon: 'document-text-outline' as const },
  { label: 'Recurring weekly sessions', icon: 'repeat-outline' as const },
  { label: 'Reimbursement tracking', icon: 'wallet-outline' as const },
  { label: 'Advanced analytics', icon: 'trending-up-outline' as const },
  { label: 'Student progress tools', icon: 'school-outline' as const },
  { label: 'Custom statements', icon: 'create-outline' as const },
] as const;

const PLAN_MONTHS: Record<(typeof PRICING.options)[number]['id'], number> = {
  monthly: 1,
  half_year: 6,
  yearly: 12,
};

const COMPARISON = [
  { label: 'Active students', free: 'Up to 2', pro: 'Unlimited', icon: 'people-outline' as const },
  { label: 'PDF statements', free: '2 / month', pro: 'Unlimited', icon: 'document-text-outline' as const },
  { label: 'Recurring sessions', free: 'Not included', pro: 'Included', icon: 'repeat-outline' as const },
  { label: 'Reimbursement tools', free: 'Not included', pro: 'Included', icon: 'wallet-outline' as const },
] as const;

export default function UpgradeScreen() {
  const theme = useTheme();
  const entitlement = useAuthStore((state) => state.entitlement);
  const profile = useAuthStore((state) => state.profile);
  const activePlan = activePlanFor(entitlement);
  const isPro = activePlan === 'pro';
  const [selectedId, setSelectedId] = useState<(typeof PRICING.options)[number]['id']>('yearly');
  const selectedPlan = useMemo(
    () => PRICING.options.find((option) => option.id === selectedId) ?? PRICING.options[2],
    [selectedId],
  );
  const selectedMonths = PLAN_MONTHS[selectedPlan.id];
  const monthlyEquivalent = selectedPlan.amount / selectedMonths;

  async function openContact(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open contact link', 'Please try again or contact the owner another way.');
    }
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <Card variant="premium">
          <View style={{ gap: theme.space[16] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
              <Image source={ILLUSTRATIONS.tutoring} style={{ width: 92, height: 92 }} resizeMode="contain" />
              <View style={{ flex: 1, gap: theme.space[8] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                  <Ionicons name="star" size={17} color={theme.colors.premium} />
                  <Text token="micro" color={theme.colors.premiumText}>TUTOR HUNT PRO</Text>
                </View>
                <Text token="h1">More room to grow</Text>
                <Text token="caption" color={theme.colors.textMuted}>Keep your tutoring work organized without the Free plan limits.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12] }}>
              <PlanBadge plan={activePlan} />
              {isPro ? <Text token="caption" color={theme.colors.premiumText}>Your access is active</Text> : <Text token="caption" color={theme.colors.textMuted}>Manual activation after payment</Text>}
            </View>
          </View>
        </Card>

        {isPro ? (
          <Card variant="raised" style={{ backgroundColor: theme.colors.successSubtle, borderColor: theme.colors.successBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="h3">Your Pro access is active</Text>
                <Text token="caption" color={theme.colors.textSecondary}>
                  {entitlement?.proUntil ? `Active until ${formatDisplayDate(entitlement.proUntil)}.` : 'Your Pro access has no recorded expiry.'}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <View style={{ gap: theme.space[12] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="micro" color={theme.colors.textSecondary}>COMPARE PLANS</Text>
            <Text token="h2">What changes with Pro?</Text>
          </View>
          <Card variant="raised" padded={false}>
            <View style={{ padding: theme.layout.cardPadding, gap: theme.space[12] }}>
              <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
                <View style={{ flex: 1 }} />
                <Text token="micro" color={theme.colors.textMuted} style={{ width: 82, textAlign: 'center' }}>FREE</Text>
                <Text token="micro" color={theme.colors.premiumText} style={{ width: 82, textAlign: 'center' }}>PRO</Text>
              </View>
              {COMPARISON.map((item, index) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12], paddingTop: index === 0 ? 0 : theme.space[12], borderTopWidth: index === 0 ? 0 : 0.5, borderTopColor: theme.colors.borderSubtle }}>
                  <View style={{ width: 28, height: 28, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={item.icon} size={16} color={theme.colors.primary} />
                  </View>
                  <Text token="caption" style={{ flex: 1 }}>{item.label}</Text>
                  <Text token="caption" color={theme.colors.textMuted} style={{ width: 82, textAlign: 'center' }}>{item.free}</Text>
                  <Text token="caption" color={theme.colors.premiumText} style={{ width: 82, textAlign: 'center' }}>{item.pro}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="micro" color={theme.colors.textSecondary}>PRO INCLUDES</Text>
              <Text token="h2">Tools for a smoother tutoring routine</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {PRO_FEATURES.map((feature) => <Chip key={feature.label} label={feature.label} icon={feature.icon} variant="status" tone="premium" />)}
            </View>
          </View>
        </Card>

        <View style={{ gap: theme.space[12] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="micro" color={theme.colors.textSecondary}>CHOOSE YOUR PLAN</Text>
            <Text token="h2">Simple pricing</Text>
          </View>
          {PRICING.options.map((option) => {
            const months = PLAN_MONTHS[option.id];
            const isSelected = selectedId === option.id;
            const savings = months > 1 ? PRICING.options[0].amount * months - option.amount : 0;
            return (
              <Card
                key={option.id}
                variant="interactive"
                onPress={() => setSelectedId(option.id)}
                accessibilityLabel={`Select ${option.label} Pro plan`}
                style={{
                  borderColor: isSelected ? theme.colors.premium : theme.colors.borderSubtle,
                  borderWidth: isSelected ? 1.5 : 0.5,
                  backgroundColor: isSelected ? theme.colors.premiumSubtle : theme.colors.surface,
                }}
              >
                <View style={{ gap: theme.space[8] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
                    <View style={{ flex: 1, gap: theme.space[4] }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                        <Text token="h3">{option.label}</Text>
                        {option.id === 'yearly' ? <Chip label="Best value" variant="status" tone="premium" /> : null}
                      </View>
                      <Text token="caption" color={theme.colors.textMuted}>{formatPeso(monthlyEquivalent)} effective per month</Text>
                    </View>
                    <Text token="h2" tabular>{`${PRICING.symbol}${option.amount}`}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[8] }}>
                    <Text token="caption" color={theme.colors.textMuted}>{savings > 0 ? `Save ${formatPesoCompact(savings)} compared with monthly` : 'Good for trying Pro'}</Text>
                    {isSelected ? <Chip label="Selected" variant="status" tone="premium" icon="checkmark" /> : null}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        <Card variant="accent">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
              <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />
              <Text token="h2">Activate Pro</Text>
            </View>
            <Text token="body">Send the owner your selected plan and the email connected to your Tutor Hunt account.</Text>
            <View style={{ padding: theme.space[12], borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }}>
              <Text token="micro" color={theme.colors.textSecondary}>YOUR ACCOUNT EMAIL</Text>
              <Text token="bodyStrong" numberOfLines={1}>{profile?.email ?? 'Sign in to show your account email'}</Text>
            </View>
            <View style={{ gap: theme.space[4] }}>
              <Text token="caption" color={theme.colors.textSecondary}>Selected plan</Text>
              <Text token="bodyStrong">{selectedPlan.label} · {formatPeso(selectedPlan.amount)}</Text>
            </View>
            <Text token="caption" color={theme.colors.textMuted}>After payment is confirmed, the owner will activate Pro on this account.</Text>
            <Button label="Message the owner on Messenger" icon="chatbubble-ellipses-outline" onPress={() => void openContact(OWNER_CONTACT.messengerUrl)} fullWidth />
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View style={{ flex: 1 }}><Button label="Facebook" icon="logo-facebook" variant="secondary" onPress={() => void openContact(OWNER_CONTACT.facebookUrl)} fullWidth /></View>
              <View style={{ flex: 1 }}><Button label="Call" icon="call-outline" variant="secondary" onPress={() => void openContact(OWNER_CONTACT.phoneUrl)} fullWidth /></View>
            </View>
          </View>
        </Card>

        <Button label="Back" variant="ghost" onPress={() => router.back()} fullWidth />
      </View>
    </Screen>
  );
}
