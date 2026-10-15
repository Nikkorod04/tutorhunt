import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, TopAppBar, useToast } from '@/components/ui';
import { SessionForm } from '@/components/SessionForm';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { createSession, getSession, rescheduleSession, sessionErrorMessage, type SessionInput } from '@/services/sessions.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { showToastAfterNavigation } from '@/utils/feedback';
import type { Session, Student } from '@/types';

export default function AddSessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[]; rescheduleFrom?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const rescheduleFrom = Array.isArray(params.rescheduleFrom) ? params.rescheduleFrom[0] : params.rescheduleFrom;
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();
  const [students, setStudents] = useState<Student[]>([]);
  const [source, setSource] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const page = await listStudents(profile.uid, { status: 'active', pageSize: 50 });
        setStudents(page.items);
        if (rescheduleFrom) setSource(await getSession(profile.uid, rescheduleFrom));
      } catch (caught) {
        setError(sessionErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile, rescheduleFrom]);

  async function submit(input: SessionInput) {
    if (!profile || !beginSubmit()) return;
    setBusy(true); setError(null);
    let savedId: string | null = null;
    let leavingScreen = false;
    try {
      savedId = rescheduleFrom
        ? await rescheduleSession(profile.uid, rescheduleFrom, input)
        : await createSession(profile.uid, input);
      leavingScreen = Boolean(savedId);
    } catch (caught) {
      const message = sessionErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
      return;
    } finally {
      endSubmit();
      if (!leavingScreen) setBusy(false);
    }

    if (!savedId) return;
    router.replace({ pathname: '/session-detail', params: { id: savedId } } as never);
    showToastAfterNavigation(showToast, rescheduleFrom ? 'Session rescheduled successfully' : 'Session added successfully');
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (rescheduleFrom && !source) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session unavailable" description="This session could not be found or is no longer available to reschedule." /></Screen>;
  if (rescheduleFrom && source?.status !== 'scheduled') return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session cannot be rescheduled" description="Only scheduled sessions can be moved to a replacement schedule." /></Screen>;
  if (students.length === 0 && !rescheduleFrom) return <Screen scroll><EmptyState icon="people-outline" title="Add a student first" description="Sessions must belong to an active student." action={undefined} /></Screen>;

  return <Screen scroll header={<TopAppBar title={rescheduleFrom ? 'Reschedule session' : 'Add session'} onBack={() => router.back()} />}><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>{error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}<SessionForm students={students} initial={source} preferredStudentId={studentId} mode={rescheduleFrom ? 'reschedule' : 'full'} submitLabel={rescheduleFrom ? 'Create replacement' : 'Save session'} busy={busy} onSubmit={submit} /></View></Screen>;
}
