import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { ParentPostForm } from '@/components/ParentPostForm';
import { getParentPost, parentPostErrorMessage, updateParentPost, type ParentPostInput } from '@/services/parentPosts.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { ParentPost } from '@/types';

export default function ParentRequestEditScreen() {
  const theme = useTheme(); const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>(); const id = Array.isArray(rawId) ? rawId[0] : rawId; const profile = useAuthStore((state) => state.profile); const { showToast } = useToast(); const [post, setPost] = useState<ParentPost | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { async function load() { if (!id) { setLoading(false); return; } try { setPost(await getParentPost(id)); } catch (caught) { setError(parentPostErrorMessage(caught)); } finally { setLoading(false); } } void load(); }, [id]);
  async function submit(input: ParentPostInput) { if (!profile || !id) return; setBusy(true); setError(null); try { await updateParentPost(profile.uid, id, input); showToast('Tutoring request updated'); router.replace({ pathname: '/parent-request-detail', params: { id } } as never); } catch (caught) { const message = parentPostErrorMessage(caught); setError(message); showToast(message, 'danger'); } finally { setBusy(false); } }
  if (loading) return <Screen scroll><View style={{ paddingTop: theme.space[16] }}><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  if (!post) return <Screen scroll><EmptyState icon="alert-circle-outline" title="Request not found" description={error ?? 'This request may have been deleted.'} /></Screen>;
  return <Screen scroll><View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}><FormHeader eyebrow="TUTOR MARKETPLACE" title="Edit request" description="Keep your tutoring request clear and current for interested tutors." icon="create-outline" />{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<ParentPostForm initial={post} submitLabel="Save changes" busy={busy} onSubmit={submit} /></View></Screen>;
}
