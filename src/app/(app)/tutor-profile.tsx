import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, EmptyState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { ContactActionButton } from '@/components/ContactActionButton';
import { RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
import { TUTOR_MODE_LABELS } from '@/constants/tutorProfile';
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

        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[8] }}>
              <Chip label={rateText} variant="status" tone="info" />
              <Chip label={profile.tutoringModes.map((mode) => TUTOR_MODE_LABELS[mode]).join(' · ')} variant="status" tone="neutral" />
            </View>
          </View>
        </Card>

        {profile.shortBio ? <Card variant="flat"><View style={{ gap: theme.space[8] }}><Text token="micro" color={theme.colors.textSecondary}>ABOUT THIS TUTOR</Text><Text token="body">{profile.shortBio}</Text></View></Card> : null}

        <RecordDetailSection title="WHAT I TEACH">
          <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <Text token="bodyStrong">Subjects</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {profile.subjects.map((subject) => <Chip key={subject} label={subject} />)}
            </View>
            <Text token="caption" color={theme.colors.textSecondary}>Grade levels</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {profile.gradeLevels.map((gradeLevel) => <Chip key={gradeLevel} label={gradeLevel} />)}
            </View>
          </View>
          </Card>
        </RecordDetailSection>

        <RecordDetailSection title="SERVICE DETAILS">
          <Card variant="raised" padded={false}>
            <View style={{ paddingHorizontal: theme.layout.cardPadding }}>
              <RecordDetailRow icon="cash-outline" label="Hourly rate" value={rateText} tone="info" divider />
              <RecordDetailRow icon="location-outline" label="Service area" value={profile.servesAllBarangays ? `${profile.city} · All barangays` : profile.barangaysServed.length > 0 ? `${profile.city} · ${profile.barangaysServed.join(', ')}` : profile.city} tone="success" divider />
              <RecordDetailRow icon="desktop-outline" label="Tutoring modes" value={profile.tutoringModes.map((mode) => TUTOR_MODE_LABELS[mode]).join(' · ')} tone="premium" />
            </View>
          </Card>
        </RecordDetailSection>

        {profile.education || profile.experienceSummary ? (
          <RecordDetailSection title="BACKGROUND">
            <Card variant="raised" padded={false}>
              <View style={{ paddingHorizontal: theme.layout.cardPadding }}>
                {profile.education ? <RecordDetailRow icon="school-outline" label="Education" value={profile.education} tone="info" divider={Boolean(profile.experienceSummary)} /> : null}
                {profile.experienceSummary ? <RecordDetailRow icon="briefcase-outline" label="Experience" value={profile.experienceSummary} tone="neutral" /> : null}
              </View>
            </Card>
          </RecordDetailSection>
        ) : null}

        <Card variant="accent">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
            <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={21} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, gap: theme.space[8] }}>
              <Text token="micro" color={theme.colors.primary}>READY TO CONNECT?</Text>
              <Text token="h3">Contact this tutor</Text>
              <ContactActionButton preference={profile.contactPreference} value={profile.contactValue} />
            </View>
          </View>
        </Card>

        {isOwnProfile ? <Button label="Edit public profile" icon="create-outline" variant="secondary" onPress={() => router.push('/tutor-profile-edit' as never)} fullWidth /> : null}
      </View>
    </Screen>
  );
}
