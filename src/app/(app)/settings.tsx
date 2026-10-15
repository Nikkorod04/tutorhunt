import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Switch, View } from 'react-native';

import { Card, ListRow, Screen, SectionHeader, Skeleton, Text, TopAppBar, useToast } from '@/components/ui';
import { syncUpcomingSessionReminders } from '@/services/notification-delivery.service';
import {
  getNotificationPreferences,
  notificationErrorMessage,
  updateNotificationPreferences,
} from '@/services/notifications.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { NotificationPreferences } from '@/types';

type PreferenceKey = keyof NotificationPreferences;

function preferenceTitle(key: PreferenceKey): string {
  if (key === 'sessionReminders') return 'Upcoming session reminders';
  if (key === 'proUpdates') return 'Pro and account updates';
  return 'Product tips and updates';
}

function preferenceSubtitle(key: PreferenceKey): string {
  if (key === 'sessionReminders') return 'Get reminders before a scheduled tutoring session.';
  if (key === 'proUpdates') return 'Receive updates about Pro access and your account.';
  return 'Occasional guidance about using Tutor Buddy.';
}

function preferenceIcon(key: PreferenceKey): 'calendar-outline' | 'star-outline' | 'bulb-outline' {
  if (key === 'sessionReminders') return 'calendar-outline';
  if (key === 'proUpdates') return 'star-outline';
  return 'bulb-outline';
}

function PreferenceRow({
  preferenceKey,
  value,
  busy,
  onChange,
}: {
  preferenceKey: PreferenceKey;
  value: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <ListRow
      title={preferenceTitle(preferenceKey)}
      subtitle={preferenceSubtitle(preferenceKey)}
      leading={
        <View style={{ width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={preferenceIcon(preferenceKey)} size={18} color={theme.colors.primary} />
        </View>
      }
      trailing={
        <Switch
          value={value}
          disabled={busy}
          onValueChange={onChange}
          accessibilityLabel={preferenceTitle(preferenceKey)}
          trackColor={{ false: theme.colors.borderDefault, true: theme.colors.primaryBorder }}
          thumbColor={value ? theme.colors.primary : theme.colors.surface}
        />
      }
    />
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState<PreferenceKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setPreferences(await getNotificationPreferences(profile.uid));
      setError(null);
    } catch (caught) {
      setError(notificationErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function togglePreference(key: PreferenceKey, value: boolean) {
    if (!profile || !preferences) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingPreference(key);
    try {
      await updateNotificationPreferences(profile.uid, next);
      if (key === 'sessionReminders') await syncUpcomingSessionReminders(profile.uid, value);
      showToast('Settings updated');
    } catch (caught) {
      setPreferences(previous);
      showToast(notificationErrorMessage(caught), 'danger');
    } finally {
      setSavingPreference(null);
    }
  }

  return (
    <Screen scroll header={<TopAppBar title="Settings" onBack={() => router.back()} />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <Card variant="raised" padded={false}>
          <View style={{ paddingHorizontal: theme.layout.cardPadding, paddingTop: theme.layout.cardPadding }}>
            <SectionHeader title="NOTIFICATIONS" />
            <Text token="caption" color={theme.colors.textMuted} style={{ marginBottom: theme.space[8] }}>
              Choose which updates Tutor Buddy should send you. You can change these anytime.
            </Text>
          </View>
          {loading ? (
            <View style={{ padding: theme.layout.cardPadding }}><Skeleton variant="list" rows={2} /></View>
          ) : preferences ? (
            <>
              <PreferenceRow preferenceKey="sessionReminders" value={preferences.sessionReminders} busy={savingPreference === 'sessionReminders'} onChange={(value) => void togglePreference('sessionReminders', value)} />
              <PreferenceRow preferenceKey="proUpdates" value={preferences.proUpdates} busy={savingPreference === 'proUpdates'} onChange={(value) => void togglePreference('proUpdates', value)} />
              <PreferenceRow preferenceKey="productUpdates" value={preferences.productUpdates} busy={savingPreference === 'productUpdates'} onChange={(value) => void togglePreference('productUpdates', value)} />
            </>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
