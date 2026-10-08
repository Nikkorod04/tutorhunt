import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ListRow, Screen, Text } from '@/components/ui';
import {
  listStatements,
  statementErrorMessage,
  STATEMENT_PAGE_SIZE,
  type StatementPage,
} from '@/services/statements.service';
import { listStudents } from '@/services/students.service';
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

  const loadFirst = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [page, students] = await Promise.all([
        listStatements(profile.uid, null, STATEMENT_PAGE_SIZE),
        listStudents(profile.uid, { pageSize: 100 }),
      ]);
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setStudentNames(Object.fromEntries(students.items.map((student) => [student.id, student.nickname])));
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  async function loadMore() {
    if (!profile || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listStatements(profile.uid, cursor, STATEMENT_PAGE_SIZE);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  const header = (
    <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[8], gap: theme.space[8] }}>
      <Text token="h1">Statements</Text>
      <Text token="caption" color={theme.colors.textMuted}>Your generated statement records. PDFs stay on your device.</Text>
    </View>
  );

  return (
    <Screen header={header} padded={false}>
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
            <Card variant="raised" padded={false}>
              <ListRow
                title={item.statementNumber}
                subtitle={`${studentNames[item.studentId] ?? 'Student'} · ${formatDisplayDate(item.generatedAt)}${item.status === 'voided' ? ' · Voided' : ''}`}
                leading={<Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />}
                trailing={<Text token="caption" tabular>{formatPesoCompact(item.totalDue)}</Text>}
                showChevron
                onPress={() => router.push({ pathname: '/statement-detail', params: { id: item.id } } as never)}
              />
            </Card>
          )}
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="document-text-outline" title="No statements yet" description="Generate a statement after recording billable sessions or reimbursable expenses." action={<Button label="Generate statement" onPress={() => router.push('/statement-new' as never)} />} /></Card>}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        />
        <View style={{ position: 'absolute', left: theme.layout.screenPadding, right: theme.layout.screenPadding, bottom: theme.space[16] + insets.bottom }}>
          <Button label="Generate statement" icon="add" onPress={() => router.push('/statement-new' as never)} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
