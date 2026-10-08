/**
 * Parent home.
 *
 * Parent dashboard and marketplace entry point.
 */

import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { RecordListCard, RecordListSummary } from '@/components/RecordList';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { listParentPosts, parentPostErrorMessage } from '@/services/parentPosts.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { ParentPost } from '@/types';
import { parentPostDateLabel } from '@/utils/parentPost';

export function ParentHome() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const firstName = (profile?.displayName ?? 'there').split(' ')[0];
  const [requests, setRequests] = useState<ParentPost[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!profile) {
      setRequestsLoading(false);
      return;
    }
    setRequestsLoading(true);
    try {
      const page = await listParentPosts({ parentUid: profile.uid });
      setRequests(page.items.slice(0, 3));
      setRequestsError(null);
    } catch (caught) {
      setRequestsError(parentPostErrorMessage(caught));
    } finally {
      setRequestsLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => {
    void loadRequests();
  }, [loadRequests]));

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
              <Image source={ILLUSTRATIONS.parent} style={{ width: 82, height: 82 }} resizeMode="contain" />
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="micro" color={theme.colors.premiumText}>PARENT MARKETPLACE</Text>
                <Text token="h2">Find a tutor</Text>
                <Text token="caption" color={theme.colors.textMuted}>Browse trusted options near your family.</Text>
              </View>
            </View>
            <Button
              label="Start browsing"
              icon="search-outline"
              variant="secondary"
              onPress={() => router.push('/find-tutors' as never)}
              fullWidth
            />
          </View>
        </Card>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.space[12], marginBottom: theme.space[8] }}>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="micro" color={theme.colors.textSecondary}>YOUR ACTIVITY</Text>
              <Text token="h2">Your requests</Text>
            </View>
            <Button label="View all" variant="ghost" size="sm" onPress={() => router.push('/requests' as never)} />
          </View>
          {requestsError ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{requestsError}</Text></Card> : null}
          {requestsLoading ? (
            <Card variant="flat"><View style={{ gap: theme.space[12] }}><Skeleton height={22} /><Skeleton width="72%" height={18} /><Skeleton width="58%" height={18} /></View></Card>
          ) : requests.length === 0 ? (
            <Card variant="flat">
              <EmptyState
                icon="document-text-outline"
                title="No requests yet"
                description="Post what you need and tutors will find you."
                action={<Button label="Post a request" variant="secondary" onPress={() => router.push('/requests' as never)} />}
              />
              </Card>
          ) : (
            <View style={{ gap: theme.space[12] }}>
              <RecordListSummary icon="document-text-outline" label="RECENT REQUESTS" value={`${requests.length}`} description="Your latest posted tutoring needs." />
              {requests.map((item) => (
                <RecordListCard
                  key={item.id}
                  icon="document-text-outline"
                  iconTone={item.status === 'open' ? 'success' : 'neutral'}
                  title={item.title}
                  subtitle={`${item.city}${item.area ? ` · ${item.area}` : ''} · ${parentPostDateLabel(item)}`}
                  status={<Text token="micro" color={item.status === 'open' ? theme.colors.successText : theme.colors.textMuted}>{item.status === 'open' ? 'OPEN' : 'CLOSED'}</Text>}
                  actionLabel="View request"
                  onPress={() => router.push({ pathname: '/parent-request-detail', params: { id: item.id } } as never)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
