import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Chip, EmptyState, IconButton, Text } from '@/components/ui';
import { getMarketplaceTutor, listFavorites, marketplaceErrorMessage, removeFavorite } from '@/services/marketplace.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { TutorFavorite } from '@/types';
import { formatPesoCompact } from '@/utils/currency';

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<TutorFavorite[]>([]);
  const [cursor, setCursor] = useState<Parameters<typeof listFavorites>[1]>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadFirst = useCallback(async (refresh = false) => {
    if (!account || account.role !== 'parent') return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const page = await listFavorites(account.uid);
      setItems(page.items); setCursor(page.cursor); setHasMore(page.hasMore);
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
    finally { if (refresh) setRefreshing(false); else setLoading(false); }
  }, [account]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  async function loadMore() {
    if (!account || account.role !== 'parent' || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listFavorites(account.uid, cursor);
      setItems((current) => [...current, ...page.items]); setCursor(page.cursor); setHasMore(page.hasMore);
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
    finally { setLoadingMore(false); }
  }

  async function openFavorite(item: TutorFavorite) {
    try {
      const current = await getMarketplaceTutor(item.tutorUid);
      if (!current || !current.isVisible) {
        Alert.alert('Tutor unavailable', 'This tutor is no longer listed in the marketplace. You can remove the saved snapshot from Favorites.');
        return;
      }
      router.push({ pathname: '/tutor-profile', params: { id: item.tutorUid } } as never);
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
  }

  async function remove(item: TutorFavorite) {
    if (!account || busyId) return;
    setBusyId(item.tutorUid);
    try {
      await removeFavorite(account.uid, item.tutorUid);
      setItems((current) => current.filter((favorite) => favorite.tutorUid !== item.tutorUid));
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
    finally { setBusyId(null); }
  }

  if (account?.role !== 'parent') return <EmptyState icon="heart-outline" title="Favorites are for parents" description="Save tutors from the marketplace when signed in as a parent." />;

  function renderFavorite({ item }: { item: TutorFavorite }) {
    const rate = item.rateFrom === null ? 'Rate on request' : `From ${formatPesoCompact(item.rateFrom)} / hour`;
    return (
      <Card variant="raised" style={{ marginBottom: theme.space[12] }} padded={false}>
        <Pressable onPress={() => void openFavorite(item)} style={{ padding: theme.layout.cardPadding }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <Avatar name={item.displayName} imageUrl={item.profilePhotoUrl} size="md" />
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="h3" numberOfLines={1}>{item.displayName}</Text>
              <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{item.city || 'City not listed'}</Text>
              <Text token="bodyStrong">{rate}</Text>
            </View>
            <IconButton icon="heart" tone="danger" accessibilityLabel={`Remove ${item.displayName} from favorites`} disabled={busyId === item.tutorUid} onPress={() => void remove(item)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8], marginTop: theme.space[12] }}>
            {item.subjects.slice(0, 3).map((subject) => <Chip key={subject} label={subject} />)}
          </View>
        </Pressable>
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <FlatList
        data={items} keyExtractor={(item) => item.tutorUid} renderItem={renderFavorite} onEndReached={() => void loadMore()} onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="always" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadFirst(true)} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: insets.top + theme.space[8], paddingBottom: theme.space[32] }}
        ListHeaderComponent={<View style={{ gap: theme.space[4], marginBottom: theme.space[16] }}><Text token="h1">Favorites</Text><Text token="caption" color={theme.colors.textMuted}>Your saved tutor profiles, kept here even if a listing changes.</Text>{error ? <Card variant="flat" style={{ marginTop: theme.space[8] }}><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}</View>}
        ListEmptyComponent={loading ? <View style={{ paddingVertical: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <EmptyState icon="heart-outline" title="No favorites yet" description="Save a tutor from Find Tutors and they will appear here." />}
        ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16] }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
      />
    </View>
  );
}
