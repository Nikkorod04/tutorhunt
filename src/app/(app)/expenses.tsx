import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  Text,
} from '@/components/ui';
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

  const header = (
    <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[8], gap: theme.space[8] }}>
      <Text token="h1">{studentName ? `${studentName}'s expenses` : 'Expenses'}</Text>
      <Text token="caption" color={theme.colors.textMuted}>
        Track tutoring costs and reimbursable expenses.
      </Text>
    </View>
  );

  return (
    <Screen header={header} padded={false}>
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
            <Card variant="raised" padded={false}>
              <ListRow
                title={item.title}
                subtitle={`${expenseCategoryLabel(item.category)} · ${formatDisplayDate(item.expenseDates[0] ?? item.createdAt)}`}
                leading={<Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />}
                trailing={<View style={{ alignItems: 'flex-end', gap: theme.space[4] }}><Text token="caption" tabular>{formatPesoCompact(expenseTotal(item))}</Text><Text token="micro" color={item.reimbursable ? theme.colors.infoText : theme.colors.textMuted}>{item.reimbursable ? 'Reimbursable' : 'Personal'}</Text></View>}
                showChevron
                onPress={() => router.push({ pathname: '/expense-detail', params: { id: item.id } } as never)}
              />
            </Card>
          )}
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="receipt-outline" title="No expenses yet" description="Record transport, materials, printing and other tutoring costs." action={<Button label="Add expense" onPress={() => router.push({ pathname: '/expense-new', params: studentId ? { studentId } : undefined } as never)} />} /></Card>}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        />

        <View style={{ position: 'absolute', left: theme.layout.screenPadding, right: theme.layout.screenPadding, bottom: theme.space[16] + insets.bottom }}>
          <Button label="Add expense" icon="add" onPress={() => router.push({ pathname: '/expense-new', params: studentId ? { studentId } : undefined } as never)} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
