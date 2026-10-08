import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, EmptyState, IconButton, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { CONTACT_PREFERENCE_LABELS, TUTOR_MODE_LABELS } from '@/constants/tutorProfile';
import { getTutorProfile, tutorProfileErrorMessage } from '@/services/tutorProfiles.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { TutorProfile } from '@/types';
import { formatPesoCompact } from '@/utils/currency';

export default function TutorProfileScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestedId = Array.isArray(params.id) ? params.id[0] : params.id;
  const account = useAuthStore((state) => state.profile);
  const uid = requestedId ?? account?.uid;
  const isOwnProfile = uid === account?.uid;
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setLoading(false);
      return () => { active = false; };
    }
    void getTutorProfile(uid)
      .then((found) => {
        if (active) setProfile(found);
      })
      .catch((caught) => {
        if (active) setError(tutorProfileErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [uid]);

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8], paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.space[4], paddingBottom: theme.space[4] }}>
      <IconButton icon="chevron-back" variant="tonal" accessibilityLabel="Go back" onPress={() => router.back()} />
      <Text token="h2">Tutor profile</Text>
    </View>
  );

  if (loading) {
    return <Screen header={header} scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="70%" height={32} /><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  if (!profile || (!profile.isVisible && !isOwnProfile)) {
    return (
      <Screen header={header} scroll>
        <EmptyState
          icon="person-outline"
          title={isOwnProfile ? 'Create your public profile' : 'Profile unavailable'}
          description={error ?? (isOwnProfile ? 'Add your subjects, rates and contact preference before publishing.' : 'This tutor has not published a public profile.')}
          action={isOwnProfile ? <Button label="Edit public profile" onPress={() => router.push('/tutor-profile-edit' as never)} /> : undefined}
        />
      </Screen>
    );
  }

  const rateText = profile.minRate === null
    ? 'Rate available on request'
    : profile.maxRate !== null && profile.maxRate !== profile.minRate
      ? `${formatPesoCompact(profile.minRate)}–${formatPesoCompact(profile.maxRate)} / hour`
      : `${formatPesoCompact(profile.minRate)} / hour`;

  return (
    <Screen header={header} scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        <Card variant="raised">
          <View style={{ alignItems: 'center', gap: theme.space[12] }}>
            <Avatar name={profile.displayName} imageUrl={profile.profilePhotoUrl} size="lg" ringed={profile.identityVerified} />
            <View style={{ alignItems: 'center', gap: theme.space[4] }}>
              <Text token="h1" align="center">{profile.displayName}</Text>
              <Text token="caption" color={theme.colors.textMuted}>{profile.city}, {profile.province}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[8] }}>
              {profile.identityVerified ? <Badge label="Identity verified" tone="success" /> : null}
              {profile.credentialsVerified ? <Badge label="Credentials verified" tone="info" /> : null}
              {isOwnProfile && !profile.isVisible ? <Chip variant="status" tone="neutral" label="Hidden" /> : null}
            </View>
          </View>
        </Card>

        {profile.shortBio ? <Card variant="flat"><Text token="body">{profile.shortBio}</Text></Card> : null}

        <Card variant="raised">
          <SectionHeader title="What I teach" />
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {profile.subjects.map((subject) => <Chip key={subject} label={subject} />)}
            </View>
            <Text token="caption" color={theme.colors.textSecondary}>Grade levels</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {profile.gradeLevels.map((gradeLevel) => <Chip key={gradeLevel} label={gradeLevel} />)}
            </View>
          </View>
        </Card>

        <Card variant="raised">
          <SectionHeader title="Details" />
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}><Ionicons name="cash-outline" size={18} color={theme.colors.primary} /><Text token="body">{rateText}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[8] }}><Ionicons name="location-outline" size={18} color={theme.colors.primary} /><Text token="body">{profile.servesAllBarangays ? `${profile.city} · All barangays` : profile.barangaysServed.length > 0 ? `${profile.city} · ${profile.barangaysServed.join(', ')}` : profile.city}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}><Ionicons name="desktop-outline" size={18} color={theme.colors.primary} /><Text token="body">{profile.tutoringModes.map((mode) => TUTOR_MODE_LABELS[mode]).join(' · ')}</Text></View>
          </View>
        </Card>

        {profile.education || profile.experienceSummary ? (
          <Card variant="raised">
            <SectionHeader title="Background" />
            <View style={{ gap: theme.space[12] }}>
              {profile.education ? <View style={{ gap: theme.space[4] }}><Text token="caption" color={theme.colors.textMuted}>Education</Text><Text token="body">{profile.education}</Text></View> : null}
              {profile.experienceSummary ? <View style={{ gap: theme.space[4] }}><Text token="caption" color={theme.colors.textMuted}>Experience</Text><Text token="body">{profile.experienceSummary}</Text></View> : null}
            </View>
          </Card>
        ) : null}

        <Card variant="accent">
          <View style={{ gap: theme.space[8] }}>
            <Text token="h3">Contact this tutor</Text>
            <Text token="caption" color={theme.colors.textMuted}>{CONTACT_PREFERENCE_LABELS[profile.contactPreference]}</Text>
            <Text token="bodyStrong">{profile.contactValue}</Text>
          </View>
        </Card>

        {isOwnProfile ? <Button label="Edit public profile" icon="create-outline" variant="secondary" onPress={() => router.push('/tutor-profile-edit' as never)} fullWidth /> : null}
      </View>
    </Screen>
  );
}
