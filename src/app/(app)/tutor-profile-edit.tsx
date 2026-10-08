import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { TutorProfileForm } from '@/components/TutorProfileForm';
import { getTutorProfile, tutorProfileErrorMessage, upsertTutorProfile, type TutorProfileInput } from '@/services/tutorProfiles.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { TutorProfile } from '@/types';

export default function TutorProfileEditScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [publicProfile, setPublicProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!profile || profile.role !== 'tutor') {
      setLoading(false);
      return () => { active = false; };
    }

    void getTutorProfile(profile.uid)
      .then((found) => {
        if (active) setPublicProfile(found);
      })
      .catch((caught) => {
        if (active) setError(tutorProfileErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [profile]);

  async function handleSubmit(input: TutorProfileInput) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await upsertTutorProfile(profile.uid, input);
      setPublicProfile(saved);
      showToast(publicProfile ? 'Tutor profile updated' : 'Tutor profile published');
      router.replace({ pathname: '/tutor-profile', params: { id: profile.uid } } as never);
    } catch (caught) {
      const message = tutorProfileErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (profile?.role !== 'tutor') {
    return <Screen scroll><EmptyState icon="lock-closed-outline" title="Tutor profile unavailable" description="Only tutor accounts can publish a public profile." /></Screen>;
  }

  if (loading) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="60%" height={32} /><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <View style={{ gap: theme.space[4] }}>
          <FormHeader eyebrow="TUTOR PROFILE" title="Public profile" description="Tell parents what you teach, where you work and how they can reach you." icon="globe-outline" />
        </View>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        <TutorProfileForm
          accountName={profile.displayName}
          accountEmail={profile.email}
          initial={publicProfile}
          submitLabel={publicProfile ? 'Save public profile' : 'Create public profile'}
          busy={busy}
          onSubmit={handleSubmit}
        />
      </View>
    </Screen>
  );
}
