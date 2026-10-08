import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { SessionForm } from '@/components/SessionForm';
import { getSession, sessionErrorMessage, updateSession, type SessionInput } from '@/services/sessions.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Session, Student } from '@/types';

export default function EditSessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const profile = useAuthStore((state) => state.profile);
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile || !id) { setLoading(false); return; }
      try {
        const [found, page] = await Promise.all([getSession(profile.uid, id), listStudents(profile.uid, { pageSize: 50 })]);
        setSession(found); setStudents(page.items);
      } catch (caught) { setError(sessionErrorMessage(caught)); }
      finally { setLoading(false); }
    }
    void load();
  }, [profile, id]);

  async function submit(input: SessionInput) {
    if (!profile || !id) return;
    setBusy(true); setError(null);
    try { await updateSession(profile.uid, id, input); router.replace({ pathname: '/session-detail', params: { id } } as never); }
    catch (caught) { setError(sessionErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="45%" height={28} /><Skeleton variant="card" /></View></Screen>;
  if (!session) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Session not found" description="It may have been deleted, or the link is out of date." /></Screen>;
  if (session.status === 'rescheduled') return <Screen scroll><EmptyState icon="calendar-outline" title="This session was rescheduled" description="Edit the replacement session instead." /></Screen>;

  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><Text token="h1">Edit session</Text>{error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}<SessionForm students={students} initial={session} submitLabel="Save changes" busy={busy} onSubmit={submit} /></View></Screen>;
}
