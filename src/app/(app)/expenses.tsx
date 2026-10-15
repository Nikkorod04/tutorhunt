import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  Chip,
  EmptyState,
  Screen,
  Text,
  TopAppBar,
} from '@/components/ui';
import { RecordListCard } from '@/components/RecordList';
import {
  EXPENSE_PAGE_SIZE,
  type ExpensePage,
  expenseErrorMessage,
  listExpenses,
} from '@/services/expenses.service';
import { getStudent } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Expense } from '@/types';
import { expenseCategoryLabel } from '@/constants/expenses';
import { expenseTotal } from '@/utils/pricing';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

type ExpenseFilter = 'all' | 'reimbursable' | 'personal';

export default function ExpensesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const profile = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<Expense[]>([]);
  const [cursor, setCursor] = useState<ExpensePage['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);

  const visibleItems = items.filter((item) => (
    filter === 'all'
      ? true
      : filter === 'reimbursable'
        ? item.reimbursable
        : !item.reimbursable
  ));
  const loadFirst = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const page = await listExpenses(profile.uid, { studentId, pageSize: EXPENSE_PAGE_SIZE });
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      if (studentId) {
        const student = await getStudent(profile.uid, studentId);
        setStudentName(student?.nickname ?? null);
      }
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, studentId]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!profile || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listExpenses(profile.uid, { studentId, pageSize: EXPENSE_PAGE_SIZE, cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(expenseErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen header={<TopAppBar title={studentName ? `${studentName}'s expenses` : 'Expenses'} />} padded={false}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingVertical: theme.space[12] }}>
          <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
            <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Reimbursable" selected={filter === 'reimbursable'} onPress={() => setFilter('reimbursable')} />
            <Chip label="Personal" selected={filter === 'personal'} onPress={() => setFilter('personal')} />
          </View>
        </View>

        {error ? <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[12] }}><Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card></View> : null}

        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.space[64] + theme.space[16] + insets.bottom, gap: theme.space[8] }}
          refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={loadFirst} tintColor={theme.colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => (
            <RecordListCard
              icon="receipt-outline"
              iconTone={item.reimbursable ? 'info' : 'neutral'}
              title={item.title}
              subtitle={`${expenseCategoryLabel(item.category)} · ${formatDisplayDate(item.expenseDates[0] ?? item.createdAt)}`}
              amount={formatPesoCompact(expenseTotal(item))}
              status={<Chip variant="status" tone={item.reimbursable ? 'info' : 'neutral'} label={item.reimbursable ? 'Reimbursable' : 'Personal'} />}
              tags={
                <>
                  <Chip variant="status" tone="neutral" label={expenseCategoryLabel(item.category)} icon="pricetag-outline" />
                  <Chip variant="status" tone="neutral" label={`${item.expenseDates.length} occurrence${item.expenseDates.length === 1 ? '' : 's'}`} icon="calendar-outline" />
                </>
              }
              actionLabel="View expense"
              onPress={() => router.push({ pathname: '/expense-detail', params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="receipt-outline" title="No expenses yet" description="Record transport, materials, printing and other tutoring costs." /></Card>}
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
            onPress={() => router.push({ pathname: '/expense-new', params: studentId ? { studentId } : undefined } as never)}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
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
