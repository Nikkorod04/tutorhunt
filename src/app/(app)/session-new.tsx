import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, TopAppBar, useToast } from '@/components/ui';
import { SessionForm } from '@/components/SessionForm';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { createSession, getSession, sessionErrorMessage, updateSession, type SessionInput } from '@/services/sessions.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { showToastAfterNavigation } from '@/utils/feedback';
import type { Session, Student } from '@/types';

export default function AddSessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[]; sessionId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
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
        if (sessionId) {
          setSource(await getSession(profile.uid, sessionId));
        } else {
          const page = await listStudents(profile.uid, { status: 'active', pageSize: 50 });
          setStudents(page.items);
        }
      } catch (caught) {
        setError(sessionErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile, sessionId]);

  async function submit(input: SessionInput) {
    if (!profile || !beginSubmit()) return;
    setBusy(true); setError(null);
    let savedId: string | null = null;
    let leavingScreen = false;
    try {
      if (sessionId) {
        await updateSession(profile.uid, sessionId, input);
        savedId = sessionId;
      } else {
        savedId = await createSession(profile.uid, input);
      }
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
    showToastAfterNavigation(showToast, sessionId ? 'Session rescheduled successfully' : 'Session added successfully');
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (sessionId && !source) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session unavailable" description="This session could not be found or is no longer available to reschedule." /></Screen>;
  if (sessionId && source?.status !== 'scheduled') return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session cannot be rescheduled" description="Only scheduled sessions can be moved to another time." /></Screen>;
  if (students.length === 0 && !sessionId) return <Screen scroll><EmptyState icon="people-outline" title="Add a student first" description="Sessions must belong to an active student." action={undefined} /></Screen>;

  return <Screen scroll header={<TopAppBar title={sessionId ? 'Reschedule session' : 'Add session'} onBack={() => router.back()} />}><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>{error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}<SessionForm students={students} initial={source} preferredStudentId={studentId} mode={sessionId ? 'reschedule' : 'full'} submitLabel={sessionId ? 'Save new schedule' : 'Save session'} busy={busy} onSubmit={submit} /></View></Screen>;
}
