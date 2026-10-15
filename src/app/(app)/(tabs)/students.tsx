/**
 * Students list.
 *
 * Paginated, with a fixed order (nickname) and a pull-to-refresh. The active
 * count comes from a server-side aggregation, so showing "2 of 2 active" costs
 * one read rather than counting the collection (blueprint section 7.3).
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  Text,
  TextField,
  TopAppBar,
} from '@/components/ui';
import { activePlanFor, limitsFor } from '@/constants/plans';
import { NotificationBell } from '@/components/NotificationBell';
import {
  countActiveStudents,
  listStudents,
  STUDENT_PAGE_SIZE,
  studentErrorMessage,
} from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useTheme, type Tone } from '@/theme';
import type { Student, StudentStatus } from '@/types';
import { ageFromBirthday } from '@/utils/date';

const FILTERS: { value: StudentStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_TONE: Record<StudentStatus, Tone> = {
  active: 'success',
  inactive: 'neutral',
  archived: 'warning',
};

const STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

function subtitleFor(student: Student): string {
  const parts: string[] = [];
  if (student.gradeLevel) parts.push(student.gradeLevel);
  if (student.school) parts.push(student.school);
  if (student.birthday) parts.push(`${ageFromBirthday(student.birthday)} yrs`);
  return parts.length > 0 ? parts.join(' · ') : 'No details yet';
}

export default function StudentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const limits = limitsFor(activePlanFor(entitlement));

  const {
    items,
    filter,
    loading,
    loadingMore,
    hasMore,
    cursor,
    error,
    setFilter,
    setLoading,
    setLoadingMore,
    setError,
    setPage,
    appendPage,
  } = useStudentStore();

  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const loadFirstPage = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const page = await listStudents(profile.uid, {
        status: filter,
        pageSize: STUDENT_PAGE_SIZE,
      });
      setPage(page);
      setActiveCount(await countActiveStudents(profile.uid));
    } catch (caught) {
      setError(studentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, filter, setLoading, setError, setPage]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = useCallback(async () => {
    if (!profile || !cursor || !hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listStudents(profile.uid, {
        status: filter,
        pageSize: STUDENT_PAGE_SIZE,
        cursor,
      });
      appendPage(page);
    } catch (caught) {
      setError(studentErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [profile, cursor, hasMore, loading, loadingMore, filter, appendPage, setLoadingMore, setError]);

  const atCap =
    Number.isFinite(limits.maxActiveStudents) &&
    activeCount !== null &&
    activeCount >= limits.maxActiveStudents;

  const visibleItems = search.trim()
    ? items.filter((item) => `${item.nickname} ${item.school} ${item.gradeLevel}`.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  const header = (
    <TopAppBar title="Students" action={<NotificationBell />} />
  );

  return (
    <Screen
      header={header}
      padded={false}
    >
      <View style={{ flex: 1, position: 'relative' }}>
        <FlatList
          style={{ flex: 1 }}
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingBottom: theme.space[64] + theme.space[24],
            gap: theme.space[8],
          }}
          ListHeaderComponent={
            <View style={{ gap: theme.space[12], paddingTop: theme.space[12], paddingBottom: theme.space[4] }}>
              <TextField
                value={search}
                onChangeText={setSearch}
                placeholder="Search students"
                icon="search-outline"
                compact
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.space[8] }}>
                {FILTERS.map((option) => (
                  <Chip
                    key={option.label}
                    variant="filter"
                    label={option.label}
                    selected={filter === option.value}
                    onPress={() => setFilter(option.value)}
                  />
                ))}
              </ScrollView>
              {atCap ? (
                <Card variant="premium">
                  <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
                    <Ionicons name="star" size={20} color={theme.colors.premium} />
                    <View style={{ flex: 1, gap: theme.space[4] }}>
                      <Chip label="Upgrade to Pro" variant="status" tone="premium" icon="star-outline" />
                      <Text token="caption" color={theme.colors.premiumText}>You have reached the free plan limit.</Text>
                      <Text token="caption" color={theme.colors.textMuted}>Archive one student, or upgrade for unlimited students.</Text>
                      <Button label="View Pro plans" size="sm" variant="accent" onPress={() => router.push('/upgrade' as never)} />
                    </View>
                  </View>
                </Card>
              ) : null}
              {error ? (
                <Card variant="flat">
                  <Text token="caption" color={theme.colors.dangerText}>{error}</Text>
                </Card>
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading && items.length > 0}
              onRefresh={loadFirstPage}
              tintColor={theme.colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => (
            <Card
              variant="interactive"
              onPress={() => router.push(`/student-detail?id=${item.id}` as never)}
              accessibilityLabel={`View student ${item.nickname}`}
            >
              <View style={{ gap: theme.space[12] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
                  <Avatar
                    builtin={item.avatarType === 'custom' ? undefined : item.avatarType}
                    imageUrl={item.avatarType === 'custom' ? item.customAvatarUrl : null}
                    name={item.nickname}
                    size="md"
                  />
                  <View style={{ flex: 1, gap: theme.space[4] }}>
                    <Text token="h3" numberOfLines={1}>{item.nickname}</Text>
                    <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{subtitleFor(item)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textHint} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                  <Chip variant="status" tone={STATUS_TONE[item.status]} label={STATUS_LABEL[item.status]} />
                  {item.gradeLevel ? <Chip variant="status" tone="info" label={item.gradeLevel} icon="school-outline" /> : null}
                  <Chip variant="status" tone="neutral" label={item.rateType === 'hourly' ? 'Hourly rate' : 'Per session'} icon="cash-outline" />
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : (
              <Card variant="flat">
                <EmptyState
                  icon="people-outline"
                  title={search ? 'No matching students' : 'No students yet'}
                  description={search ? 'Try a different name, school or grade.' : 'Add your first tutee to begin tracking sessions.'}
                />
              </Card>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
        />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: theme.space[16] + insets.bottom,
            paddingHorizontal: theme.layout.screenPadding,
            alignItems: 'flex-end',
          }}
        >
          <Pressable
            onPress={() => router.push('/student-new' as never)}
            disabled={atCap}
            accessibilityRole="button"
            accessibilityLabel="Add student"
            accessibilityState={{ disabled: atCap }}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: atCap ? theme.colors.surfaceSunken : theme.colors.primary,
              opacity: pressed ? 0.82 : atCap ? 0.55 : 1,
              elevation: 4,
              shadowColor: theme.colors.textPrimary,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            })}
          >
            <Ionicons name="add" size={28} color={atCap ? theme.colors.textMuted : theme.colors.textOnPrimary} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
