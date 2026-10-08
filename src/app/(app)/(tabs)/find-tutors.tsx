import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, Card, Chip, EmptyState, IconButton, Text, TextField, useToast } from '@/components/ui';
import { LocationPicker } from '@/components/LocationPicker';
import { RecordListSummary } from '@/components/RecordList';
import { TUTOR_GRADE_LEVELS, TUTOR_MODE_LABELS, TUTOR_SUBJECTS } from '@/constants/tutorProfile';
import { locationForCity, TUTOR_HUNT_LOCATIONS } from '@/constants/locations';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { getParentProfile } from '@/services/parentProfiles.service';
import { getFavoriteIds, listTutorProfiles, marketplaceErrorMessage, removeFavorite, saveFavorite, type TutorFilterKind } from '@/services/marketplace.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { TutorProfile } from '@/types';
import { formatPesoCompact } from '@/utils/currency';

const FILTER_LABELS: Record<TutorFilterKind, string> = { subject: 'Subject', grade: 'Grade', mode: 'Mode', rate: 'Max rate', verified: 'Verified', barangay: 'Barangay' };

export default function FindTutorsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [items, setItems] = useState<TutorProfile[]>([]);
  const [city, setCity] = useState('');
  const [cityDraft, setCityDraft] = useState('');
  const [parentProfileLoaded, setParentProfileLoaded] = useState(false);
  const [filterKind, setFilterKind] = useState<TutorFilterKind | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [rateDraft, setRateDraft] = useState('');
  const [cursor, setCursor] = useState<Awaited<ReturnType<typeof listTutorProfiles>>['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!account || account.role !== 'parent') return;
    void getParentProfile(account.uid).then((parent) => {
      if (parent?.city) { setCity(parent.city); setCityDraft(parent.city); }
    }).catch(() => undefined).finally(() => setParentProfileLoaded(true));
  }, [account]);

  const activeFilter = useMemo(() => filterKind && filterValue ? { kind: filterKind, value: filterValue } : null, [filterKind, filterValue]);

  const loadFirst = useCallback(async (refresh = false) => {
    if (!account || account.role !== 'parent') return;
    if (!parentProfileLoaded) return;
    if (!city.trim()) {
      setItems([]); setCursor(null); setHasMore(false); setLoading(false); setRefreshing(false); setError(null);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const page = await listTutorProfiles({ city, filter: activeFilter });
      setItems(page.items); setCursor(page.cursor); setHasMore(page.hasMore);
      setFavoriteIds(await getFavoriteIds(account.uid));
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
    finally { if (refresh) setRefreshing(false); else setLoading(false); }
  }, [account, activeFilter, city, parentProfileLoaded]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  async function loadMore() {
    if (!account || account.role !== 'parent' || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listTutorProfiles({ city, filter: activeFilter, cursor });
      setItems((current) => [...current, ...page.items]); setCursor(page.cursor); setHasMore(page.hasMore);
    } catch (caught) { setError(marketplaceErrorMessage(caught)); }
    finally { setLoadingMore(false); }
  }

  function chooseFilter(kind: TutorFilterKind) {
    setFilterKind(kind); setFilterValue(kind === 'verified' ? 'true' : '');
    if (kind !== 'rate') setRateDraft('');
  }

  function applyFilters() {
    setCity(cityDraft.trim());
    if (filterKind === 'rate') setFilterValue(rateDraft.trim());
  }

  async function toggleFavorite(tutor: TutorProfile) {
    if (!account || account.role !== 'parent' || favoriteBusy) return;
    setFavoriteBusy(tutor.uid);
    const saved = favoriteIds.has(tutor.uid);
    try {
      if (saved) await removeFavorite(account.uid, tutor.uid); else await saveFavorite(account.uid, tutor);
      setFavoriteIds((current) => { const next = new Set(current); if (saved) next.delete(tutor.uid); else next.add(tutor.uid); return next; });
      showToast(saved ? 'Tutor removed from favorites' : 'Tutor saved to favorites');
    } catch (caught) { const message = marketplaceErrorMessage(caught); setError(message); showToast(message, 'danger'); }
    finally { setFavoriteBusy(null); }
  }

  function renderTutor({ item }: { item: TutorProfile }) {
    const saved = favoriteIds.has(item.uid);
    const rate = item.rateFrom === null ? 'Rate on request' : `From ${formatPesoCompact(item.rateFrom)} / hour`;
    return (
      <Card variant="raised" style={{ marginBottom: theme.space[12] }} padded={false}>
        <Pressable onPress={() => router.push({ pathname: '/tutor-profile', params: { id: item.uid } } as never)} style={{ padding: theme.layout.cardPadding, gap: theme.space[12] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
            <Avatar name={item.displayName} imageUrl={item.profilePhotoUrl} size="md" ringed={item.identityVerified} />
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="h3" numberOfLines={1}>{item.displayName}</Text>
              <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{item.city} · {item.primarySubject || item.subjects[0] || 'Tutor'}</Text>
            </View>
            <IconButton icon={saved ? 'heart' : 'heart-outline'} tone={saved ? 'danger' : 'default'} accessibilityLabel={saved ? `Remove ${item.displayName} from favorites` : `Save ${item.displayName} to favorites`} disabled={favoriteBusy === item.uid} onPress={() => void toggleFavorite(item)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12], padding: theme.space[12], borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySubtle }}>
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Text token="micro" color={theme.colors.primary}>HOURLY RATE</Text>
              <Text token="bodyStrong">{rate}</Text>
            </View>
            <Text token="bodyStrong" color={theme.colors.primary}>View profile</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {item.subjects.slice(0, 3).map((subject) => <Chip key={subject} label={subject} />)}
            {item.credentialsVerified ? <Badge label="Verified" tone="success" /> : null}
          </View>
        </Pressable>
      </Card>
    );
  }

  if (account?.role !== 'parent') return <EmptyState icon="search-outline" title="Tutor search is for parents" description="Switch to a parent account to browse tutor profiles." />;

  const filterValues = filterKind === 'subject'
    ? TUTOR_SUBJECTS.map((value) => ({ value, label: value }))
    : filterKind === 'grade'
      ? TUTOR_GRADE_LEVELS.map((value) => ({ value, label: value }))
      : filterKind === 'mode'
        ? (Object.keys(TUTOR_MODE_LABELS) as ('online' | 'face_to_face')[]).map((value) => ({ value, label: TUTOR_MODE_LABELS[value] }))
        : filterKind === 'barangay'
          ? (locationForCity(city)?.barangays ?? []).map((value) => ({ value, label: value }))
          : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <FlatList
        data={items} keyExtractor={(item) => item.uid} renderItem={renderTutor} onEndReached={() => void loadMore()} onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="always" keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadFirst(true)} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: insets.top + theme.space[8], paddingBottom: theme.space[32] }}
        ListHeaderComponent={(
          <View style={{ gap: theme.space[12], marginBottom: theme.space[16] }}>
            <Card variant="premium">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
                <Image source={ILLUSTRATIONS.tutor} style={{ width: 76, height: 76 }} resizeMode="contain" />
                <View style={{ flex: 1, gap: theme.space[4] }}>
                  <Text token="micro" color={theme.colors.premiumText}>TUTOR MARKETPLACE</Text>
                  <Text token="h2">Find the right fit</Text>
                  <Text token="caption" color={theme.colors.textMuted}>Browse tutors near your family and compare what they offer.</Text>
                </View>
              </View>
            </Card>
            <Card variant="raised">
              <View style={{ gap: theme.space[12] }}>
                <View style={{ gap: theme.space[4] }}><Text token="h3">Search your area</Text><Text token="caption" color={theme.colors.textMuted}>Start with a city or municipality, then refine the results.</Text></View>
                <LocationPicker label="City / municipality" value={cityDraft} options={TUTOR_HUNT_LOCATIONS.map((location) => location.city)} placeholder="Choose a city or municipality" onChange={(value) => { if (typeof value === 'string') { setCityDraft(value); setFilterKind(null); setFilterValue(''); setRateDraft(''); } }} />
                <Button label="Search tutors" icon="search-outline" variant="primary" onPress={applyFilters} fullWidth />
              </View>
            </Card>
            <Card variant="flat">
              <View style={{ gap: theme.space[12] }}>
                <View style={{ gap: theme.space[4] }}><Text token="micro" color={theme.colors.textSecondary}>REFINE RESULTS</Text><Text token="bodyStrong">What matters most?</Text></View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                  <Chip label="Any filter" selected={!filterKind} onPress={() => { setFilterKind(null); setFilterValue(''); setRateDraft(''); }} />
                  {(Object.keys(FILTER_LABELS) as TutorFilterKind[]).map((kind) => <Chip key={kind} label={FILTER_LABELS[kind]} selected={filterKind === kind} onPress={() => chooseFilter(kind)} />)}
                </View>
                {filterKind === 'rate' ? <View style={{ gap: theme.space[8] }}><TextField label="Maximum hourly rate" value={rateDraft} onChangeText={setRateDraft} placeholder="600" keyboardType="decimal-pad" /><Button label="Apply rate filter" size="md" variant="secondary" onPress={applyFilters} fullWidth /></View> : null}
                {filterValues.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{filterValues.map((option) => <Chip key={option.value} label={option.label} selected={filterValue === option.value} onPress={() => setFilterValue(option.value)} />)}</View> : null}
                {filterKind === 'verified' ? <Text token="caption" color={theme.colors.textSecondary}>Showing tutors with verified credentials.</Text> : null}
              </View>
            </Card>
            {items.length > 0 ? <RecordListSummary icon="people-outline" label="TUTORS FOUND" value={`${items.length}${hasMore ? '+' : ''}`} description={`Visible profiles in ${city}.`} /> : null}
            {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
          </View>
        )}
        ListEmptyComponent={loading ? <View style={{ paddingVertical: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : !city.trim() ? <EmptyState icon="location-outline" title="Set your city first" description="Add your city to find tutors with reliable local results." action={<Button label="Edit parent profile" variant="secondary" onPress={() => router.push('/parent-profile-edit' as never)} />} /> : <EmptyState icon="search-outline" title="No tutors found" description="Try a different city or filter." />}
        ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16] }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
      />
    </View>
  );
}
