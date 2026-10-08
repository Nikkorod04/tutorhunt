import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Chip, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { RecordListCard, RecordListSummary } from '@/components/RecordList';
import { listParentPosts, parentPostErrorMessage } from '@/services/parentPosts.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { ParentPost } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { parentPostDateLabel } from '@/utils/parentPost';

function budgetLabel(item: ParentPost) {
  if (item.budgetType === 'negotiable') return 'Budget negotiable';
  const unit = item.budgetType === 'hourly' ? '/ hour' : '/ session';
  if (item.minBudget !== null && item.maxBudget !== null) {
    return item.minBudget === item.maxBudget
      ? `${formatPesoCompact(item.minBudget)} ${unit}`
      : `${formatPesoCompact(item.minBudget)}–${formatPesoCompact(item.maxBudget)} ${unit}`;
  }
  if (item.minBudget !== null) return `From ${formatPesoCompact(item.minBudget)} ${unit}`;
  if (item.maxBudget !== null) return `Up to ${formatPesoCompact(item.maxBudget)} ${unit}`;
  return 'Budget not set';
}

export default function RequestsScreen() {
  const theme = useTheme(); const profile = useAuthStore((state) => state.profile); const [items, setItems] = useState<ParentPost[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!profile) return; setLoading(true); try { setItems((await listParentPosts({ parentUid: profile.uid })).items); setError(null); } catch (caught) { setError(parentPostErrorMessage(caught)); } finally { setLoading(false); } }, [profile]);
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));
  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="50%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  const openCount = items.filter((item) => item.status === 'open').length;

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.space[12] }}>
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="h1">My requests</Text>
            <Text token="caption" color={theme.colors.textMuted}>Keep your tutoring needs organized and easy for tutors to understand.</Text>
          </View>
          <Button label="New request" size="sm" icon="add" onPress={() => router.push('/parent-request-new' as never)} />
        </View>
        {items.length > 0 ? <RecordListSummary icon="document-text-outline" label="YOUR REQUESTS" value={`${items.length}`} description={`${openCount} open · ${items.length - openCount} closed`} /> : null}
        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}
        {items.length === 0 ? (
          <Card variant="flat">
            <EmptyState icon="document-text-outline" title="No requests yet" description="Post what you need and tutors will find you." action={<Button label="Post a request" onPress={() => router.push('/parent-request-new' as never)} />} />
          </Card>
        ) : (
          <View style={{ gap: theme.space[12] }}>
            {items.map((item) => (
              <RecordListCard
                key={item.id}
                icon="document-text-outline"
                iconTone={item.status === 'open' ? 'success' : 'neutral'}
                title={item.title}
                subtitle={`${item.city}${item.area ? ` · ${item.area}` : ''} · ${parentPostDateLabel(item)}`}
                amount={budgetLabel(item)}
                status={<Badge label={item.status === 'open' ? 'Open' : 'Closed'} tone={item.status === 'open' ? 'success' : 'neutral'} />}
                tags={<><Chip label={item.subject} /><Chip label={item.gradeLevel} /><Chip label={item.tutoringMode === 'either' ? 'Online or face-to-face' : item.tutoringMode === 'online' ? 'Online' : 'Face-to-face'} /></>}
                actionLabel="View request"
                accessibilityLabel={`View request: ${item.title}`}
                onPress={() => router.push({ pathname: '/parent-request-detail', params: { id: item.id } } as never)}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
