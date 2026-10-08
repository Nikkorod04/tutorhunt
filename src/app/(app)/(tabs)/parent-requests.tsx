import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { LocationPicker } from '@/components/LocationPicker';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { TUTOR_HUNT_CITIES } from '@/constants/locations';
import { TUTOR_MODE_LABELS, TUTOR_SUBJECTS } from '@/constants/tutorProfile';
import {
  getParentPostInterest,
  listParentPosts,
  parentPostErrorMessage,
  type ParentPostPage,
} from '@/services/parentPosts.service';
import { getTutorProfile } from '@/services/tutorProfiles.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { ParentPost, ParentPostTutoringMode, TutorProfile } from '@/types';
import { parentPostDateLabel } from '@/utils/parentPost';

interface RequestSection {
  title: string;
  data: ParentPost[];
}

type InterestStatusByPost = Record<string, 'active'>;

const MODES: readonly { value: ParentPostTutoringMode; label: string }[] = [
  { value: 'face_to_face', label: TUTOR_MODE_LABELS.face_to_face },
  { value: 'online', label: TUTOR_MODE_LABELS.online },
  { value: 'either', label: 'Either mode' },
];

function modeLabel(mode: ParentPostTutoringMode): string {
  return mode === 'either' ? 'Face-to-face or online' : TUTOR_MODE_LABELS[mode];
}

function budgetLabel(item: ParentPost): string {
  if (item.budgetType === 'negotiable') return 'Negotiable';

  const range = `${item.minBudget !== null ? `₱${item.minBudget}` : ''}${item.minBudget !== null && item.maxBudget !== null ? ' – ' : ''}${item.maxBudget !== null ? `₱${item.maxBudget}` : ''}`;
  return `${range || 'Budget set'} ${item.budgetType === 'hourly' ? 'per hour' : 'per session'}`;
}

function requestScore(item: ParentPost, profile: TutorProfile | null): number {
  if (!profile) return 0;

  let score = 0;
  if (profile.city && item.city === profile.city) score += 3;
  if (profile.subjects.includes(item.subject) || profile.primarySubject === item.subject) score += 2;
  if (item.tutoringMode === 'either' || profile.tutoringModes.includes(item.tutoringMode)) score += 1;
  return score;
}

function TutorHuntHero({ requestCount, hasProfile }: { requestCount: number; hasProfile: boolean }) {
  const theme = useTheme();

  return (
    <Card
      variant="raised"
      style={{
        backgroundColor: theme.colors.primarySubtle,
        borderColor: theme.colors.primaryBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
        <View style={{ flex: 1, gap: theme.space[8] }}>
          <Text token="micro" color={theme.colors.primary}>TUTOR HUNT</Text>
          <Text token="h1">Find your next student</Text>
          <Text token="caption" color={theme.colors.textSecondary}>
            {hasProfile
              ? 'Requests are prioritized around your profile and service area.'
              : 'Browse families looking for help and find a request that fits you.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} />
            <Text token="caption" color={theme.colors.primary}>
              {`${requestCount} open request${requestCount === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>
        <Image
          source={ILLUSTRATIONS.tutoring}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </Card>
  );
}

function RequestCard({
  item,
  recommended,
  interested,
  onPress,
}: {
  item: ParentPost;
  recommended: boolean;
  interested: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Card variant="interactive" onPress={onPress} accessibilityLabel={`View tutoring request: ${item.title}`}>
      <View style={{ gap: theme.space[12] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.accentSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="school-outline" size={22} color={theme.colors.accentPressed} />
          </View>
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="h3" numberOfLines={2}>{item.title}</Text>
            <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {`${item.subject} · ${item.gradeLevel}`}
            </Text>
          </View>
          <Badge label="Open" tone="success" />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
          {recommended ? <Badge label="Recommended" tone="premium" /> : null}
          {interested ? <Badge label="Interest sent" tone="info" /> : null}
          <Chip
            label={`${item.city}${item.area ? ` · ${item.area}` : ''}`}
            variant="status"
            tone="neutral"
            icon="location-outline"
          />
          <Chip label={modeLabel(item.tutoringMode)} variant="status" tone="info" icon="laptop-outline" />
        </View>

        <Text token="caption" color={theme.colors.textSecondary} numberOfLines={2}>
          {item.description}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: theme.space[12],
            paddingTop: theme.space[12],
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.borderSubtle,
          }}
        >
          <View style={{ flex: 1, gap: theme.space[2] }}>
            <Text token="micro" color={theme.colors.textMuted}>BUDGET</Text>
            <Text token="bodyStrong" color={theme.colors.textPrimary}>{budgetLabel(item)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: theme.space[4] }}>
            <Text token="caption" color={theme.colors.textMuted}>{parentPostDateLabel(item)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
              <Text token="bodyStrong" color={theme.colors.primary}>{interested ? 'View interest' : 'View request'}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

function FilterSheet({
  visible,
  subject,
  mode,
  onClose,
  onSubjectChange,
  onModeChange,
  onClear,
}: {
  visible: boolean;
  subject: string;
  mode: ParentPostTutoringMode | '';
  onClose: () => void;
  onSubjectChange: (value: string) => void;
  onModeChange: (value: ParentPostTutoringMode) => void;
  onClear: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: theme.colors.surfaceOverlay }}
        />
        <Card
          variant="raised"
          style={{
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingBottom: insets.bottom + theme.space[16],
            maxHeight: '88%',
          }}
        >
          <View style={{ gap: theme.space[20] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="h2">Filter requests</Text>
                <Text token="caption" color={theme.colors.textMuted}>Choose what fits your tutoring work.</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ gap: theme.space[12] }}>
                <Text token="micro" color={theme.colors.textSecondary}>SUBJECT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                  {TUTOR_SUBJECTS.map((item) => (
                    <Chip key={item} label={item} selected={subject === item} onPress={() => onSubjectChange(subject === item ? '' : item)} />
                  ))}
                </View>

                <Text token="micro" color={theme.colors.textSecondary} style={{ marginTop: theme.space[8] }}>TUTORING MODE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                  {MODES.map((item) => (
                    <Chip key={item.value} label={item.label} selected={mode === item.value} onPress={() => onModeChange(item.value)} />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12] }}>
              <Button label="Clear all" variant="ghost" onPress={onClear} />
              <Button label="Show requests" onPress={onClose} />
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

export default function ParentRequestsScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<ParentPost[]>([]);
  const [cursor, setCursor] = useState<ParentPostPage['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [city, setCity] = useState('');
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<ParentPostTutoringMode | ''>('');
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [interestStatus, setInterestStatus] = useState<InterestStatusByPost>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityTouched = useRef(false);
  const firstFocus = useRef(true);

  useEffect(() => {
    if (!profile || profile.role !== 'tutor') return;

    void getTutorProfile(profile.uid)
      .then((nextProfile) => {
        setTutorProfile(nextProfile);
        if (nextProfile?.city && !cityTouched.current) setCity(nextProfile.city);
      })
      .catch(() => {
        // Recommendations are optional; the marketplace remains usable without a profile.
      });
  }, [profile]);

  const loadInterestStatuses = useCallback(async (posts: ParentPost[]): Promise<InterestStatusByPost> => {
    if (!profile || profile.role !== 'tutor') return {};

    const entries = await Promise.all(posts.map(async (item) => {
      try {
        const record = await getParentPostInterest(item.id, profile.uid);
        return record?.status === 'active' ? [item.id, 'active'] as const : null;
      } catch {
        return null;
      }
    }));

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, 'active'] => entry !== null));
  }, [profile]);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const page = await listParentPosts({ status: 'open', city: city || undefined });
      const statuses = await loadInterestStatuses(page.items);
      setItems(page.items);
      setInterestStatus(statuses);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setError(null);
    } catch (caught) {
      setError(parentPostErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [city, loadInterestStatuses]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!firstFocus.current) void load(false);
      firstFocus.current = false;
      return undefined;
    }, [load]),
  );

  async function loadMore() {
    if (!cursor || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const page = await listParentPosts({ status: 'open', city: city || undefined, cursor });
      const statuses = await loadInterestStatuses(page.items);
      setItems((current) => [...current, ...page.items]);
      setInterestStatus((current) => ({ ...current, ...statuses }));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(parentPostErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }

  function clearFilters() {
    cityTouched.current = true;
    setCity('');
    setSubject('');
    setMode('');
  }

  const rankedItems = useMemo(() => {
    const filtered = items.filter((item) =>
      (!subject || item.subject === subject)
      && (!mode || item.tutoringMode === mode || item.tutoringMode === 'either'),
    );

    return [...filtered].sort((a, b) => requestScore(b, tutorProfile) - requestScore(a, tutorProfile));
  }, [items, mode, subject, tutorProfile]);

  const recommendedItems = useMemo(
    () => rankedItems.filter((item) => requestScore(item, tutorProfile) > 0).slice(0, 3),
    [rankedItems, tutorProfile],
  );

  const recommendedIds = useMemo(() => new Set(recommendedItems.map((item) => item.id)), [recommendedItems]);

  const sections = useMemo<RequestSection[]>(() => {
    const remaining = rankedItems.filter((item) => !recommendedIds.has(item.id));
    const next: RequestSection[] = [];
    if (recommendedItems.length > 0) next.push({ title: 'Recommended for you', data: recommendedItems });
    if (remaining.length > 0) next.push({ title: recommendedItems.length > 0 ? 'All open requests' : 'Open requests', data: remaining });
    return next;
  }, [rankedItems, recommendedIds, recommendedItems]);

  const filterCount = Number(Boolean(city)) + Number(Boolean(subject)) + Number(Boolean(mode));

  if (loading && items.length === 0) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton variant="card" height={150} />
          <Skeleton variant="card" height={96} />
          <Skeleton variant="card" height={164} />
          <Skeleton variant="card" height={164} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <SectionList<ParentPost, RequestSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[32] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: theme.colors.canvas, paddingTop: theme.space[20] }}>
            <SectionHeader title={section.title} />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ marginBottom: theme.space[12] }}>
            <RequestCard
              item={item}
              recommended={recommendedIds.has(item.id)}
              interested={interestStatus[item.id] === 'active'}
              onPress={() => router.push({ pathname: '/parent-request-detail', params: { id: item.id } } as never)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={{ gap: theme.space[16], paddingTop: theme.space[8] }}>
            <TutorHuntHero requestCount={rankedItems.length} hasProfile={Boolean(tutorProfile)} />

            <Card variant="flat">
              <View style={{ gap: theme.space[12] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12] }}>
                  <View style={{ flex: 1, gap: theme.space[4] }}>
                    <Text token="h3">Search requests</Text>
                    <Text token="caption" color={theme.colors.textMuted}>
                      {city ? `Showing requests in ${city}.` : 'Browse all service areas.'}
                    </Text>
                  </View>
                  <Button
                    label={filterCount > 0 ? `${filterCount} active` : 'Filters'}
                    variant="secondary"
                    size="sm"
                    icon="options-outline"
                    onPress={() => setFilterOpen(true)}
                  />
                </View>
                <LocationPicker
                  label="Service area"
                  value={city}
                  options={TUTOR_HUNT_CITIES}
                  placeholder="All cities"
                  onChange={(value) => {
                    cityTouched.current = true;
                    setCity(String(value));
                  }}
                />
                {filterCount > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                    {city ? <Chip label={city} variant="removable" onRemove={() => { cityTouched.current = true; setCity(''); }} /> : null}
                    {subject ? <Chip label={subject} variant="removable" onRemove={() => setSubject('')} /> : null}
                    {mode ? <Chip label={MODES.find((item) => item.value === mode)?.label ?? mode} variant="removable" onRemove={() => setMode('')} /> : null}
                  </View>
                ) : null}
              </View>
            </Card>

            {error ? (
              <Card variant="accent">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                  <Ionicons name="warning-outline" size={20} color={theme.colors.warningText} />
                  <Text token="caption" color={theme.colors.warningText} style={{ flex: 1 }}>{error}</Text>
                </View>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Card variant="flat" style={{ marginTop: theme.space[20] }}>
            <EmptyState
              icon="search-outline"
              title={filterCount > 0 ? 'No matching requests' : 'No open requests yet'}
              description={filterCount > 0 ? 'Try clearing a filter or expanding your service area.' : 'New family requests will appear here when they are posted.'}
              action={filterCount > 0 ? <Button label="Clear filters" variant="secondary" onPress={clearFilters} /> : undefined}
            />
          </Card>
        }
        ListFooterComponent={
          hasMore ? (
            <Button label="Load more requests" variant="secondary" loading={loadingMore} onPress={() => void loadMore()} fullWidth />
          ) : (
            <Text token="caption" color={theme.colors.textHint} align="center" style={{ marginTop: theme.space[12] }}>
              You’re seeing all matching open requests.
            </Text>
          )
        }
      />

      <FilterSheet
        visible={filterOpen}
        subject={subject}
        mode={mode}
        onClose={() => setFilterOpen(false)}
        onSubjectChange={setSubject}
        onModeChange={(value) => setMode(mode === value ? '' : value)}
        onClear={clearFilters}
      />
    </Screen>
  );
}
