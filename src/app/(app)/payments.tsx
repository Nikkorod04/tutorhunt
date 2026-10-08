import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, Screen, Text } from '@/components/ui';
import { RecordListCard, RecordListSummary } from '@/components/RecordList';
import {
  listPayments,
  PAYMENT_PAGE_SIZE,
  paymentErrorMessage,
  type PaymentPage,
} from '@/services/payments.service';
import { getStudent, listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Payment } from '@/types';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';

const METHOD_LABELS: Record<Payment['method'], string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  other: 'Other',
};

export default function PaymentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const profile = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<Payment[]>([]);
  const [cursor, setCursor] = useState<PaymentPage['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState<string | null>(null);
  const loadedTotal = items.reduce((sum, item) => sum + item.amount, 0);

  const loadFirst = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [page, studentPage] = await Promise.all([
        listPayments(profile.uid, { studentId, pageSize: PAYMENT_PAGE_SIZE }),
        listStudents(profile.uid, { pageSize: 100 }),
      ]);
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setStudentNames(Object.fromEntries(studentPage.items.map((student) => [student.id, student.nickname])));
      if (studentId) {
        const student = await getStudent(profile.uid, studentId);
        setStudentName(student?.nickname ?? null);
      }
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, studentId]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  async function loadMore() {
    if (!profile || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listPayments(profile.uid, { studentId, pageSize: PAYMENT_PAGE_SIZE, cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  const header = (
    <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[8], gap: theme.space[8] }}>
      <Text token="h1">{studentName ? `${studentName}'s payments` : 'Payments'}</Text>
      <Text token="caption" color={theme.colors.textMuted}>Record money received and keep student balances accurate.</Text>
    </View>
  );

  return (
    <Screen header={header} padded={false}>
      <View style={{ flex: 1 }}>
        {items.length > 0 ? (
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[12], paddingBottom: theme.space[12] }}>
            <RecordListSummary
              icon="wallet-outline"
              label="PAYMENTS LOADED"
              value={formatPesoCompact(loadedTotal)}
              description={`${items.length} payment${items.length === 1 ? '' : 's'} in the current history.`}
            />
          </View>
        ) : null}

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
              icon="wallet-outline"
              iconTone="success"
              title={studentNames[item.studentId] ?? 'Student'}
              subtitle={`${formatDisplayDate(item.datePaid)}${item.reference ? ` · Ref. ${item.reference}` : ''}`}
              amount={formatPesoCompact(item.amount)}
              status={<Chip variant="status" tone="success" label={METHOD_LABELS[item.method]} />}
              tags={item.reference ? <Chip variant="status" tone="neutral" label={item.reference} icon="bookmark-outline" /> : undefined}
              actionLabel="View payment"
              onPress={() => router.push({ pathname: '/payment-detail', params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="wallet-outline" title="No payments yet" description="Record the first payment to start tracking balances." action={<Button label="Record payment" onPress={() => router.push({ pathname: '/payment-new', params: studentId ? { studentId } : undefined } as never)} />} /></Card>}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: theme.space[16], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : null}
        />
        <View style={{ position: 'absolute', left: theme.layout.screenPadding, right: theme.layout.screenPadding, bottom: theme.space[16] + insets.bottom }}>
          <Button label="Record payment" icon="add" onPress={() => router.push({ pathname: '/payment-new', params: studentId ? { studentId } : undefined } as never)} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
