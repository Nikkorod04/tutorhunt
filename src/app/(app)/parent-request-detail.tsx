import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  Skeleton,
  Text,
  TextField,
  useToast,
  type IconName,
} from '@/components/ui';
import { ContactActionButton } from '@/components/ContactActionButton';
import {
  closeParentPost,
  createParentPostInterest,
  deleteParentPost,
  getParentPost,
  getParentPostInterest,
  listParentPostInterests,
  parentPostErrorMessage,
  withdrawParentPostInterest,
} from '@/services/parentPosts.service';
import { getParentProfile } from '@/services/parentProfiles.service';
import { getTutorProfile } from '@/services/tutorProfiles.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, type Tone } from '@/theme';
import type { ParentPost, ParentPostInterest, ParentProfile, TutorProfile } from '@/types';
import { parentPostDateLabel } from '@/utils/parentPost';

function modeLabel(mode: ParentPost['tutoringMode']): string {
  if (mode === 'either') return 'Face-to-face or online';
  return mode === 'face_to_face' ? 'Face-to-face' : 'Online';
}

function budgetLabel(post: ParentPost): string {
  if (post.budgetType === 'negotiable') return 'Negotiable';

  const range = `${post.minBudget !== null ? `₱${post.minBudget}` : ''}${post.minBudget !== null && post.maxBudget !== null ? ' – ' : ''}${post.maxBudget !== null ? `₱${post.maxBudget}` : ''}`;
  return `${range || 'Budget set'} ${post.budgetType === 'hourly' ? 'per hour' : 'per session'}`;
}

function DetailRow({
  icon,
  label,
  value,
  tone = 'neutral',
  divider = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: Tone;
  divider?: boolean;
}) {
  const theme = useTheme();
  const toneSet = theme.tones[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[12],
        paddingVertical: theme.space[12],
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: theme.colors.borderSubtle,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: toneSet.subtle,
        }}
      >
        <Ionicons name={icon} size={19} color={toneSet.solid} />
      </View>
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <Text token="micro" color={theme.colors.textMuted}>{label}</Text>
        <Text token="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

export default function ParentRequestDetailScreen() {
  const theme = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [post, setPost] = useState<ParentPost | null>(null);
  const [contact, setContact] = useState<ParentProfile | null>(null);
  const [interest, setInterest] = useState<ParentPostInterest | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [interestComposerOpen, setInterestComposerOpen] = useState(false);
  const [interestBusy, setInterestBusy] = useState(false);
  const [interestedTutors, setInterestedTutors] = useState<{ interest: ParentPostInterest; tutor: TutorProfile | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      const found = await getParentPost(id);
      setPost(found);
      if (!found) return;

      if (found.contactVisible && profile?.role === 'tutor') setContact(await getParentProfile(found.parentUid));
      else setContact(null);

      const isOwner = profile?.uid === found.parentUid;
      if (profile?.role === 'tutor' && !isOwner) setInterest(await getParentPostInterest(found.id, profile.uid));
      else setInterest(null);

      if (profile?.role === 'parent' && isOwner) {
        const records = await listParentPostInterests(found.id);
        const withProfiles = await Promise.all(records.map(async (record) => ({
          interest: record,
          tutor: await getTutorProfile(record.tutorUid).catch(() => null),
        })));
        setInterestedTutors(withProfiles);
      } else {
        setInterestedTutors([]);
      }
      setError(null);
    } catch (caught) {
      setError(parentPostErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useEffect(() => { void load(); }, [load]);

  function edit() {
    if (id) router.push({ pathname: '/parent-request-edit', params: { id } } as never);
  }

  function close() {
    if (!profile || !id) return;
    Alert.alert('Close request?', 'Tutors will no longer see this request.', [
      { text: 'Keep open', style: 'cancel' },
      {
        text: 'Close',
        onPress: async () => {
          try {
            await closeParentPost(profile.uid, id);
            showToast('Tutoring request closed');
            await load();
          } catch (caught) {
            const message = parentPostErrorMessage(caught);
            setError(message);
            showToast(message, 'danger');
          }
        },
      },
    ]);
  }

  function remove() {
    if (!profile || !id) return;
    Alert.alert('Delete request?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteParentPost(profile.uid, id);
            showToast('Tutoring request deleted');
            router.back();
          } catch (caught) {
            const message = parentPostErrorMessage(caught);
            setError(message);
            showToast(message, 'danger');
          }
        },
      },
    ]);
  }

  async function sendInterest() {
    if (!profile || profile.role !== 'tutor' || !post) return;
    setInterestBusy(true);
    setError(null);
    try {
      setInterest(await createParentPostInterest(post, profile.uid, interestMessage));
      setInterestComposerOpen(false);
      showToast('Interest sent to the parent');
    } catch (caught) {
      const message = parentPostErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setInterestBusy(false);
    }
  }

  function withdrawInterest() {
    if (!profile || profile.role !== 'tutor' || !post || !interest) return;
    Alert.alert('Withdraw interest?', 'The parent will no longer see you as interested in this request.', [
      { text: 'Keep interest', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setInterestBusy(true);
          try {
            await withdrawParentPostInterest(post.id, profile.uid);
            setInterest((current) => current ? { ...current, status: 'withdrawn' } : current);
            showToast('Interest withdrawn');
          } catch (caught) {
            const message = parentPostErrorMessage(caught);
            setError(message);
            showToast(message, 'danger');
          } finally {
            setInterestBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="35%" />
          <Skeleton variant="card" height={178} />
          <Skeleton variant="card" height={220} />
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Request not found" description={error ?? 'This request may have been deleted.'} />
        </View>
      </Screen>
    );
  }

  const isOwner = profile?.uid === post.parentUid;
  const mode = modeLabel(post.tutoringMode);
  const budget = budgetLabel(post);

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8], alignSelf: 'flex-start', minHeight: theme.layout.minTouchTarget }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
          <Text token="bodyStrong" color={theme.colors.primary}>Back</Text>
        </Pressable>

        <Card
          variant="raised"
          style={{
            backgroundColor: theme.colors.primarySubtle,
            borderColor: theme.colors.primaryBorder,
          }}
        >
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[12] }}>
              <Text token="micro" color={isOwner ? theme.colors.primary : theme.colors.textSecondary}>
                {isOwner ? 'YOUR POSTING' : 'TUTORING REQUEST'}
              </Text>
              <Badge label={post.status === 'open' ? 'Open' : 'Closed'} tone={post.status === 'open' ? 'success' : 'neutral'} />
            </View>
            <Text token="h1">{post.title}</Text>
            <Text token="caption" color={theme.colors.textSecondary}>
              {`${post.subject} · ${post.gradeLevel} · ${parentPostDateLabel(post)}`}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              <Chip label={post.city} variant="status" tone="neutral" icon="location-outline" />
              <Chip label={mode} variant="status" tone="info" icon="laptop-outline" />
            </View>
          </View>
        </Card>

        {error ? (
          <Card variant="accent">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.warningText} />
              <Text token="caption" color={theme.colors.warningText} style={{ flex: 1 }}>{error}</Text>
            </View>
          </Card>
        ) : null}

        {isOwner ? (
          <Card variant={post.status === 'open' ? 'accent' : 'flat'}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
              <Ionicons name={post.status === 'open' ? 'eye-outline' : 'eye-off-outline'} size={24} color={post.status === 'open' ? theme.colors.accentPressed : theme.colors.textMuted} />
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="h3">{post.status === 'open' ? 'Visible to tutors' : 'Posting closed'}</Text>
                <Text token="caption" color={theme.colors.textMuted}>
                  {post.status === 'open' ? 'Tutors in your selected city can discover this request.' : 'This request is no longer shown in Tutor Hunt.'}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card
          variant="raised"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSubtle,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.successSubtle,
              }}
            >
              <Ionicons name="cash-outline" size={24} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Text token="micro" color={theme.colors.textMuted}>EXPECTED BUDGET</Text>
              <Text token="h2">{budget}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: theme.space[12], gap: theme.space[12] }}>
            <View style={{ flex: 1 }}>
              <DetailRow icon="calendar-outline" label="SCHEDULE" value={post.scheduleText} tone="info" />
            </View>
            <View style={{ flex: 1 }}>
              <DetailRow icon="location-outline" label="AREA" value={post.area ? `${post.city} · ${post.area}` : post.city} tone="neutral" />
            </View>
          </View>
        </Card>

        <Card variant="raised">
          <Text token="micro" color={theme.colors.textSecondary}>ABOUT THIS REQUEST</Text>
          <Text token="body" color={theme.colors.textSecondary} style={{ marginTop: theme.space[12] }}>
            {post.description}
          </Text>
          <View style={{ marginTop: theme.space[8] }}>
            <DetailRow icon="book-outline" label="SUBJECT AND LEVEL" value={`${post.subject} · ${post.gradeLevel}`} tone="info" divider />
            <DetailRow icon="time-outline" label="SCHEDULE" value={post.scheduleText} tone="info" divider />
            <DetailRow icon="laptop-outline" label="TUTORING MODE" value={mode} tone="neutral" />
          </View>
        </Card>

        {contact?.contactVisible ? (
          <Card variant="premium">
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
              <View style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: theme.colors.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubble-ellipses-outline" size={19} color={theme.colors.premium} />
              </View>
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="h3">Contact the parent</Text>
                <ContactActionButton preference={contact.contactPreference} value={contact.contactValue} />
                <Text token="caption" color={theme.colors.textMuted}>Use this after confirming the request is a good fit.</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {!isOwner && profile?.role === 'tutor' ? (
          <Card variant={interest?.status === 'active' ? 'accent' : 'premium'}>
            <View style={{ gap: theme.space[12] }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
                <Ionicons name={interest?.status === 'active' ? 'checkmark-circle-outline' : 'hand-left-outline'} size={24} color={interest?.status === 'active' ? theme.colors.success : theme.colors.premium} />
                <View style={{ flex: 1, gap: theme.space[4] }}>
                  <Text token="h3">{interest?.status === 'active' ? 'You showed interest' : 'Could you help this family?'}</Text>
                  <Text token="caption" color={theme.colors.textMuted}>
                    {interest?.status === 'active' ? 'The parent can now review your tutor profile and message.' : 'Send a short introduction so the parent can decide if you are a good fit.'}
                  </Text>
                </View>
              </View>
              {interest?.status === 'active' ? (
                <View style={{ gap: theme.space[8] }}>
                  <Badge label="Interest sent" tone="success" />
                  <Button label="Withdraw interest" variant="ghost" loading={interestBusy} onPress={withdrawInterest} fullWidth />
                </View>
              ) : interestComposerOpen ? (
                <View style={{ gap: theme.space[12] }}>
                  <TextField label="Message (optional)" value={interestMessage} onChangeText={setInterestMessage} placeholder="Tell the parent briefly how you can help" multiline maxLength={500} showCounter />
                  <Button label="Send interest" icon="send-outline" loading={interestBusy} onPress={() => void sendInterest()} fullWidth />
                  <Button label="Cancel" variant="ghost" disabled={interestBusy} onPress={() => setInterestComposerOpen(false)} fullWidth />
                </View>
              ) : (
                <Button label="I'm interested" icon="hand-left-outline" onPress={() => setInterestComposerOpen(true)} fullWidth />
              )}
            </View>
          </Card>
        ) : null}

        {isOwner ? (
          <Card variant="flat">
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="micro" color={theme.colors.textSecondary}>INTERESTED TUTORS</Text>
                <Text token="caption" color={theme.colors.textMuted}>
                  {interestedTutors.length === 0 ? 'Tutors who respond to this request will appear here.' : `${interestedTutors.length} tutor${interestedTutors.length === 1 ? '' : 's'} interested`}
                </Text>
              </View>
              {interestedTutors.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8], paddingVertical: theme.space[8] }}>
                  <Ionicons name="people-outline" size={20} color={theme.colors.textHint} />
                  <Text token="caption" color={theme.colors.textMuted}>Keep your request open to receive responses.</Text>
                </View>
              ) : interestedTutors.map(({ interest: tutorInterest, tutor }, index) => (
                <ListRow
                  key={tutorInterest.id}
                  title={tutor?.displayName ?? 'Tutor profile unavailable'}
                  subtitle={`${tutor?.primarySubject || tutor?.subjects[0] || 'Tutor'}${tutor?.city ? ` · ${tutor.city}` : ''}${tutorInterest.message ? ` · ${tutorInterest.message}` : ''}`}
                  leading={<Avatar name={tutor?.displayName ?? 'Tutor'} imageUrl={tutor?.profilePhotoUrl} size="sm" ringed={tutor?.credentialsVerified} />}
                  trailing={tutor?.credentialsVerified ? <Badge label="Verified" tone="success" /> : null}
                  showChevron={Boolean(tutor)}
                  divider={index < interestedTutors.length - 1}
                  onPress={tutor ? () => router.push({ pathname: '/tutor-profile', params: { id: tutor.uid } } as never) : undefined}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {isOwner ? (
          <Card variant="flat">
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="h3">Manage this request</Text>
                <Text token="caption" color={theme.colors.textMuted}>Update the details or remove the posting when you no longer need a tutor.</Text>
              </View>
              {post.status === 'open' ? <Button label="Edit request" icon="create-outline" variant="secondary" onPress={edit} fullWidth /> : null}
              {post.status === 'open' ? <Button label="Close request" icon="eye-off-outline" variant="secondary" onPress={close} fullWidth /> : null}
              <Button label="Delete request" icon="trash-outline" variant="destructive" onPress={remove} fullWidth />
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
