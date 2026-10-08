import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { ParentProfileForm } from '@/components/ParentProfileForm';
import { getParentProfile, parentProfileErrorMessage, upsertParentProfile, type ParentProfileInput } from '@/services/parentProfiles.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { ParentProfile } from '@/types';

export default function ParentProfileEditScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!profile || profile.role !== 'parent') {
      setLoading(false);
      return () => { active = false; };
    }
    void getParentProfile(profile.uid)
      .then((found) => { if (active) setParentProfile(found); })
      .catch((caught) => { if (active) setError(parentProfileErrorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile]);

  async function handleSubmit(input: ParentProfileInput) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await upsertParentProfile(profile.uid, input);
      setParentProfile(saved);
      showToast(parentProfile ? 'Parent profile updated' : 'Parent profile saved');
      router.back();
    } catch (caught) {
      const message = parentProfileErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (profile?.role !== 'parent') {
    return <Screen scroll><EmptyState icon="lock-closed-outline" title="Parent profile unavailable" description="Only parent accounts can edit this profile." /></Screen>;
  }

  if (loading) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="60%" height={32} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <View style={{ gap: theme.space[4] }}>
          <FormHeader eyebrow="PARENT PROFILE" title="Parent profile" description="Set your area and the best way for tutors to reach you." icon="home-outline" />
        </View>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}
        <ParentProfileForm accountName={profile.displayName} accountEmail={profile.email} initial={parentProfile} submitLabel={parentProfile ? 'Save parent profile' : 'Create parent profile'} busy={busy} onSubmit={handleSubmit} />
      </View>
    </Screen>
  );
}
