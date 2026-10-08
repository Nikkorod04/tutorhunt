/**
 * Students list.
 *
 * Paginated, with a fixed order (nickname) and a pull-to-refresh. The active
 * count comes from a server-side aggregation, so showing "2 of 2 active" costs
 * one read rather than counting the collection (blueprint section 7.3).
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  Text,
} from '@/components/ui';
import { limitsFor } from '@/constants/plans';
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
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const limits = limitsFor(entitlement?.plan);

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

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

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

  const header = (
    <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[8] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space[12],
        }}
      >
        <Text token="h1">Students</Text>
        {activeCount !== null ? (
          <Text token="caption" color={theme.colors.textMuted} tabular>
            {Number.isFinite(limits.maxActiveStudents)
              ? `${activeCount} of ${limits.maxActiveStudents} active`
              : `${activeCount} active`}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen header={header} padded={false}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            gap: theme.space[8],
            paddingHorizontal: theme.layout.screenPadding,
            paddingVertical: theme.space[12],
          }}
        >
          {FILTERS.map((option) => (
            <Chip
              key={option.label}
              variant="filter"
              label={option.label}
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </View>

        {atCap ? (
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[12] }}>
            <Card variant="premium">
              <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
                <Ionicons name="star" size={20} color={theme.colors.premium} />
                <View style={{ flex: 1, gap: theme.space[4] }}>
                  <Text token="caption" color={theme.colors.premiumText}>
                    You have reached the free plan limit
                  </Text>
                  <Text token="caption" color={theme.colors.textMuted}>
                    Existing students are never deleted. Archive one, or upgrade for unlimited
                    students.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {error ? (
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[12] }}>
            <Card variant="flat">
              <Text token="caption" color={theme.colors.dangerText}>
                {error}
              </Text>
            </Card>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            // Clears the floating action button: 64 for the button, 16 of margin.
            paddingBottom: theme.space[64] + theme.space[16],
            gap: theme.space[8],
          }}
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
            <Card variant="raised" padded={false}>
              <ListRow
                title={item.nickname}
                subtitle={subtitleFor(item)}
                leading={
                  <Avatar
                    builtin={item.avatarType === 'custom' ? undefined : item.avatarType}
                    imageUrl={item.avatarType === 'custom' ? item.customAvatarUrl : null}
                    name={item.nickname}
                  />
                }
                trailing={
                  <Chip
                    variant="status"
                    tone={STATUS_TONE[item.status]}
                    label={STATUS_LABEL[item.status]}
                  />
                }
                showChevron
                onPress={() => router.push(`/student-detail?id=${item.id}` as never)}
              />
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
                  title="No students yet"
                  description="Add your first tutee to begin tracking sessions."
                  action={
                    <Button
                      label="Add student"
                      onPress={() => router.push('/student-new' as never)}
                    />
                  }
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

        {items.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              left: theme.layout.screenPadding,
              right: theme.layout.screenPadding,
              bottom: theme.space[16],
            }}
          >
            <Button
              label="Add student"
              icon="add"
              onPress={() => router.push('/student-new' as never)}
              fullWidth
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
