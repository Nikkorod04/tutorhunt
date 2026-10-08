import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Card, Screen, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { ParentPostForm } from '@/components/ParentPostForm';
import { createParentPost, parentPostErrorMessage, type ParentPostInput } from '@/services/parentPosts.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function ParentRequestNewScreen() {
  const theme = useTheme(); const profile = useAuthStore((state) => state.profile); const { showToast } = useToast(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(input: ParentPostInput) { if (!profile) return; setBusy(true); setError(null); try { const id = await createParentPost(profile.uid, input); showToast('Tutoring request published'); router.replace({ pathname: '/parent-request-detail', params: { id } } as never); } catch (caught) { const message = parentPostErrorMessage(caught); setError(message); showToast(message, 'danger'); } finally { setBusy(false); } }
  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><FormHeader eyebrow="TUTOR MARKETPLACE" title="Post a tutoring request" description="Tell nearby tutors what your learner needs, where and when." icon="megaphone-outline" />{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<ParentPostForm submitLabel="Publish request" busy={busy} onSubmit={submit} /></View></Screen>;
}
