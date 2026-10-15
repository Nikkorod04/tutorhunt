import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, Screen, Text, TopAppBar } from '@/components/ui';
import { RecordListCard } from '@/components/RecordList';
import {
  listPayments,
  PAYMENT_PAGE_SIZE,
  paymentErrorMessage,
  type PaymentPage,
} from '@/services/payments.service';
import { getStudentsByIds } from '@/services/students.service';
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

  const hydrateStudentNames = useCallback(async (payments: Payment[]) => {
    if (!profile) return;
    const students = await getStudentsByIds(profile.uid, payments.map((payment) => payment.studentId));
    const names = Object.fromEntries(students.map((student) => [student.id, student.nickname]));
    setStudentNames((current) => ({ ...current, ...names }));
    if (studentId) setStudentName(names[studentId] ?? null);
  }, [profile, studentId]);

  const loadFirst = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const page = await listPayments(profile.uid, { studentId, pageSize: PAYMENT_PAGE_SIZE });
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      await hydrateStudentNames(page.items);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, studentId, hydrateStudentNames]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!profile || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listPayments(profile.uid, { studentId, pageSize: PAYMENT_PAGE_SIZE, cursor });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      await hydrateStudentNames(page.items);
    } catch (caught) {
      setError(paymentErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen header={<TopAppBar title={studentName ? `${studentName}'s payments` : 'Payments'} />} padded={false}>
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
          ListEmptyComponent={loading ? <View style={{ paddingTop: theme.space[48], alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View> : <Card variant="flat"><EmptyState icon="wallet-outline" title="No payments yet" description="Record the first payment to start tracking balances." /></Card>}
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
            onPress={() => router.push({ pathname: '/payment-new', params: studentId ? { studentId } : undefined } as never)}
            accessibilityRole="button"
            accessibilityLabel="Record payment"
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
