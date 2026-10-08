/**
 * Parent home.
 *
 * Parent dashboard and marketplace entry point.
 */

import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Screen, SectionHeader, Text } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export function ParentHome() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const firstName = (profile?.displayName ?? 'there').split(' ')[0];

  return (
    <Screen scroll padded>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
          <Avatar name={profile?.displayName ?? ''} size="md" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text token="caption" color={theme.colors.textMuted}>
              Welcome
            </Text>
            <Text token="h2">{firstName}</Text>
          </View>
        </View>

        <Card variant="premium">
          <View style={{ gap: theme.space[12] }}>
            <Text token="micro" color={theme.colors.premiumText}>
              Find a tutor
            </Text>
            <Text token="h3">Browse tutors near you</Text>
            <Text token="caption" color={theme.colors.textMuted}>
              Filter by subject, grade level, city, tutoring mode and rate.
            </Text>
            <Button
              label="Start browsing"
              variant="secondary"
              onPress={() => router.push('/find-tutors' as never)}
            />
          </View>
        </Card>

        <View>
          <SectionHeader title="Your requests" />
          <Card variant="flat">
            <EmptyState
              icon="document-text-outline"
              title="No requests yet"
              description="Post what you need and tutors will find you."
            />
          </Card>
        </View>
      </View>
    </Screen>
  );
}
