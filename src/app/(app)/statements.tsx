import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Card, Chip, EmptyState, Screen, Text, TopAppBar } from '@/components/ui';
import { RecordListCard } from '@/components/RecordList';
import {
  listStatements,
  statementErrorMessage,
  STATEMENT_PAGE_SIZE,
  type StatementPage,
} from '@/services/statements.service';
import { getStudentsByIds } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Statement } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

export default function StatementsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<Statement[]>([]);
  const [cursor, setCursor] = useState<StatementPage['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  const hydrateStudentNames = useCallback(async (statements: Statement[]) => {
    if (!profile) return;
    const students = await getStudentsByIds(profile.uid, statements.map((statement) => statement.studentId));
    setStudentNames((current) => ({
      ...current,
      ...Object.fromEntries(students.map((student) => [student.id, student.nickname])),
    }));
  }, [profile]);

  const loadFirst = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const page = await listStatements(profile.uid, null, STATEMENT_PAGE_SIZE);
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      await hydrateStudentNames(page.items);
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, hydrateStudentNames]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!profile || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listStatements(profile.uid, cursor, STATEMENT_PAGE_SIZE);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      await hydrateStudentNames(page.items);
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen header={<TopAppBar title="Statements" />} padded={false}>
      <View style={{ flex: 1 }}>
        {error ? <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[12] }}><Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card></View> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[64] + theme.space[16] + insets.bottom, gap: theme.space[8] }}
          refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={loadFirst} tintColor={theme.colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => (
            <RecordListCard
              icon="document-text-outline"
              iconTone={item.status === 'active' ? 'info' : 'neutral'}
              title={item.statementNumber}
              subtitle={`${studentNames[item.studentId] ?? 'Student'} · Generated ${formatDisplayDate(item.generatedAt)}`}
              amount={formatPesoCompact(item.totalDue)}
              status={<Badge label={item.status === 'active' ? 'Active' : 'Voided'} tone={item.status === 'active' ? 'success' : 'neutral'} />}
              tags={
                <>
                  <Chip variant="status" tone="neutral" label={`${formatDisplayDate(item.periodStart)} – ${formatDisplayDate(item.periodEnd)}`} icon="calendar-outline" />
                  <Chip variant="status" tone="info" label={`${item.sessionIds.length} sessions`} icon="book-outline" />
                </>
              }
              actionLabel="View statement"
              onPress={() => router.push({ pathname: '/statement-detail', params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="document-text-outline" title="No statements yet" description="Generate a statement after recording billable sessions or reimbursable expenses." /></Card>}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
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
            onPress={() => router.push('/statement-new' as never)}
            accessibilityRole="button"
            accessibilityLabel="Generate statement"
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.82 : 1,
              elevation: 4,
              shadowColor: theme.colors.shadowBase,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            })}
          >
            <Ionicons name="add" size={28} color={theme.colors.textOnPrimary} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
