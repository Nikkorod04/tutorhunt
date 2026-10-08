import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { SessionForm } from '@/components/SessionForm';
import { createSession, getSession, rescheduleSession, sessionErrorMessage, type SessionInput } from '@/services/sessions.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';

export default function AddSessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[]; rescheduleFrom?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const rescheduleFrom = Array.isArray(params.rescheduleFrom) ? params.rescheduleFrom[0] : params.rescheduleFrom;
  const profile = useAuthStore((state) => state.profile);
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
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const id = rescheduleFrom
        ? await rescheduleSession(profile.uid, rescheduleFrom, input)
        : await createSession(profile.uid, input);
      router.replace({ pathname: '/session-detail', params: { id } } as never);
    } catch (caught) {
      setError(sessionErrorMessage(caught));
    } finally { setBusy(false); }
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (students.length === 0) return <Screen scroll><EmptyState icon="people-outline" title="Add a student first" description="Sessions must belong to an active student." action={undefined} /></Screen>;

  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><Text token="h1">{rescheduleFrom ? 'Reschedule session' : 'Add session'}</Text>{error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}<SessionForm students={students} initial={source} preferredStudentId={studentId} submitLabel={rescheduleFrom ? 'Create replacement' : 'Save session'} busy={busy} onSubmit={submit} /></View></Screen>;
}
