import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { RecurringSeriesForm } from '@/components/RecurringSeriesForm';
import { activePlanFor } from '@/constants/plans';
import { createRecurringSeries, recurringErrorMessage, type RecurringSeriesInput } from '@/services/recurring.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Student } from '@/types';

export default function RecurringNewScreen() {
  const theme = useTheme(); const profile = useAuthStore((state) => state.profile); const entitlement = useAuthStore((state) => state.entitlement); const plan = activePlanFor(entitlement); const { showToast } = useToast(); const [students, setStudents] = useState<Student[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { async function load() { if (!profile) return; try { setStudents((await listStudents(profile.uid, { status: 'active', pageSize: 100 })).items); } catch (caught) { setError(recurringErrorMessage(caught)); } finally { setLoading(false); } } void load(); }, [profile]);
  async function submit(input: RecurringSeriesInput) { if (!profile) return; setBusy(true); setError(null); try { const id = await createRecurringSeries(profile.uid, plan, input); showToast('Recurring series created'); router.replace({ pathname: '/recurring-detail', params: { id } } as never); } catch (caught) { const message = recurringErrorMessage(caught); setError(message); showToast(message, 'danger'); } finally { setBusy(false); } }
  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16] }}><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (plan !== 'pro') return <Screen scroll><View style={{ paddingTop: theme.space[24] }}><Card variant="premium"><EmptyState icon="repeat-outline" title="Recurring sessions are a Pro feature" description="Upgrade to create weekly sessions, skip holidays, and manage an entire series." action={<Button label="View Pro plans" onPress={() => router.push('/upgrade' as never)} />} /></Card></View></Screen>;
  if (students.length === 0) return <Screen scroll><EmptyState icon="people-outline" title="Add a student first" description="Recurring sessions must belong to an active student." /></Screen>;
  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><FormHeader eyebrow="PRO SCHEDULING" title="New recurring series" description="Set up a weekly lesson pattern and manage exceptions in one place." icon="repeat-outline" />{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<RecurringSeriesForm students={students} submitLabel="Create series" busy={busy} onSubmit={submit} /></View></Screen>;
}
