import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { RecurringSeriesForm } from '@/components/RecurringSeriesForm';
import { activePlanFor } from '@/constants/plans';
import { getRecurringSeries, recurringErrorMessage, updateRecurringSeries, type RecurringSeriesInput } from '@/services/recurring.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { RecurringSeries, Student } from '@/types';

export default function RecurringEditScreen() {
  const theme = useTheme(); const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>(); const id = Array.isArray(rawId) ? rawId[0] : rawId; const profile = useAuthStore((state) => state.profile); const entitlement = useAuthStore((state) => state.entitlement); const plan = activePlanFor(entitlement); const { showToast } = useToast(); const [series, setSeries] = useState<RecurringSeries | null>(null); const [students, setStudents] = useState<Student[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { async function load() { if (!profile || !id) { setLoading(false); return; } try { const [found, page] = await Promise.all([getRecurringSeries(profile.uid, id), listStudents(profile.uid, { status: 'active', pageSize: 100 })]); setSeries(found); setStudents(page.items); } catch (caught) { setError(recurringErrorMessage(caught)); } finally { setLoading(false); } } void load(); }, [profile, id]);
  async function submit(input: RecurringSeriesInput) { if (!profile || !id) return; setBusy(true); setError(null); try { await updateRecurringSeries(profile.uid, plan, id, input); showToast('Recurring series updated'); router.replace({ pathname: '/recurring-detail', params: { id } } as never); } catch (caught) { const message = recurringErrorMessage(caught); setError(message); showToast(message, 'danger'); } finally { setBusy(false); } }
  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16] }}><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!series) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Series not found" description={error ?? 'This series may have been removed.'} /></Screen>;
  if (plan !== 'pro') return <Screen scroll><View style={{ paddingTop: theme.space[24] }}><Card variant="premium"><EmptyState icon="lock-closed-outline" title="Pro access required" description="Upgrade to edit recurring sessions." action={<Button label="View Pro plans" onPress={() => router.push('/upgrade' as never)} />} /></Card></View></Screen>;
  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><FormHeader eyebrow="PRO SCHEDULING" title="Edit recurring series" description="Adjust future lessons while keeping the series history intact." icon="create-outline" />{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<RecurringSeriesForm students={students} initial={series} submitLabel="Save future changes" busy={busy} onSubmit={submit} /></View></Screen>;
}
