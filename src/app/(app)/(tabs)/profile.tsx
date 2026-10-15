import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  IconButton,
  ListRow,
  PlanBadge,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
  TextField,
  TopAppBar,
  useToast,
} from '@/components/ui';
import { activePlanFor, limitsFor } from '@/constants/plans';
import { TUTOR_AVATARS } from '@/constants/avatars';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { signOut, updateTutorAvatar } from '@/services/auth.service';
import { accountErrorMessage, deleteMyAccount } from '@/services/account.service';
import { ensureEntitlement } from '@/services/entitlements.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { TutorAvatarId } from '@/types';
import { showToastAfterNavigation } from '@/utils/feedback';

const DELETE_ACCOUNT_CONFIRMATION = 'yes-delete-my-account';

function AccountIcon({ name, color, backgroundColor }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string; backgroundColor: string }) {
  const theme = useTheme();
  return (
    <View style={{ width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const setEntitlement = useAuthStore((state) => state.setEntitlement);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarId, setAvatarId] = useState<TutorAvatarId>(profile?.avatarId ?? 'default');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [customAvatarMimeType, setCustomAvatarMimeType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();

  const activePlan = activePlanFor(entitlement);
  const limits = limitsFor(activePlan);
  const isUnlimited = !Number.isFinite(limits.monthlyPdfs);
  const used = entitlement?.pdfStatementsThisMonth ?? 0;
  const quotaRatio = isUnlimited ? 0 : Math.min(1, used / limits.monthlyPdfs);

  async function pickTutorAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a custom tutor avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Photo is too large', 'Choose a photo smaller than 5 MB.');
      return;
    }
    setAvatarId('custom');
    setCustomAvatarUri(asset.uri);
    setCustomAvatarMimeType(asset.mimeType ?? 'image/jpeg');
  }

  async function saveTutorAvatar() {
    if (!profile || avatarBusy || !beginSubmit()) return;
    setAvatarBusy(true);
    try {
      const customAvatarUrl = await updateTutorAvatar(profile.uid, {
        avatarId,
        customAvatarUrl: profile.customAvatarUrl,
        customAvatarLocalUri: avatarId === 'custom' ? customAvatarUri : null,
        customAvatarMimeType,
      });
      setProfile({ ...profile, avatarId, customAvatarUrl, updatedAt: new Date() });
      showToast('Tutor avatar updated', 'success');
      setCustomAvatarUri(null);
      setCustomAvatarMimeType(null);
      setAvatarEditorOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update your avatar.', 'danger');
    } finally {
      endSubmit();
      setAvatarBusy(false);
    }
  }

  async function handleRefresh() {
    if (!profile || busy || !beginSubmit()) return;
    setBusy(true);
    try {
      setEntitlement(await ensureEntitlement(profile.uid));
      showToast('Plan status refreshed');
    } catch {
      showToast('Could not refresh your plan status. Check your connection and try again.', 'danger');
    } finally {
      endSubmit();
      setBusy(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function confirmDeleteAccount() {
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  }

  function cancelDeleteAccount() {
    if (deleting) return;
    setDeleteConfirmation('');
    setDeleteDialogOpen(false);
  }

  function submitDeleteAccount() {
    if (deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION || deleting) return;
    setDeleteDialogOpen(false);
    setDeleteConfirmation('');
    void deleteAccount();
  }

  async function deleteAccount() {
    if (!beginSubmit()) return;
    setDeleting(true);
    let leavingScreen = false;
    try {
      await deleteMyAccount();
      // Account deletion signs the user out and the auth layout removes this
      // screen. Keep the loading subtree stable during that transition.
      leavingScreen = true;
      showToastAfterNavigation(showToast, 'Account deleted');
    } catch (caught) {
      showToast(accountErrorMessage(caught), 'danger');
    } finally {
      endSubmit();
      if (!leavingScreen) setDeleting(false);
    }
  }

  return (
    <Screen scroll padded header={<TopAppBar title="Profile" />}>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
            <Pressable
              onPress={() => setAvatarEditorOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Edit tutor avatar"
              accessibilityState={{ expanded: avatarEditorOpen }}
              style={{ position: 'relative' }}
            >
              <Avatar
                name={profile?.displayName ?? ''}
                imageUrl={profile?.avatarId === 'custom' ? profile.customAvatarUrl : null}
                builtin={profile?.avatarId === 'custom' ? 'default' : profile?.avatarId ?? 'default'}
                size="lg"
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: theme.colors.primary,
                  borderWidth: 2,
                  borderColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={13} color={theme.colors.textOnPrimary} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="h2" numberOfLines={1}>{profile?.displayName || 'Your account'}</Text>
              <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{profile?.email ?? ''}</Text>
            </View>
            <PlanBadge plan={activePlan} />
          </View>
        </Card>

        {avatarEditorOpen ? <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[8] }}>
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="h3">Choose your avatar</Text>
                <Text token="caption" color={theme.colors.textMuted}>Pick an animal avatar or upload your own photo.</Text>
              </View>
              <IconButton icon="close-outline" variant="tonal" accessibilityLabel="Close avatar editor" onPress={() => setAvatarEditorOpen(false)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {TUTOR_AVATARS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => { setAvatarId(option.id); setCustomAvatarUri(null); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose tutor avatar ${option.id.slice(-2)}`}
                  accessibilityState={{ selected: avatarId === option.id }}
                  style={{
                    width: 68,
                    alignItems: 'center',
                    gap: theme.space[4],
                    padding: theme.space[4],
                    borderRadius: theme.radius.md,
                    borderWidth: avatarId === option.id ? 2 : 1,
                    borderColor: avatarId === option.id ? theme.colors.primary : theme.colors.borderSubtle,
                    backgroundColor: avatarId === option.id ? theme.colors.primarySubtle : theme.colors.surface,
                  }}
                >
                  <Avatar builtin={option.id} size="md" />
                  <Text token="micro" color={theme.colors.textMuted}>{option.id.slice(-2)}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => void pickTutorAvatar()}
                accessibilityRole="button"
                accessibilityLabel="Choose a custom tutor avatar"
                accessibilityState={{ selected: avatarId === 'custom' }}
                style={{
                  width: 68,
                  alignItems: 'center',
                  gap: theme.space[4],
                  padding: theme.space[4],
                  borderRadius: theme.radius.md,
                  borderWidth: avatarId === 'custom' ? 2 : 1,
                  borderColor: avatarId === 'custom' ? theme.colors.primary : theme.colors.borderSubtle,
                  backgroundColor: avatarId === 'custom' ? theme.colors.primarySubtle : theme.colors.surface,
                }}
              >
                <Avatar imageUrl={customAvatarUri ?? profile?.customAvatarUrl} builtin={customAvatarUri || profile?.customAvatarUrl ? undefined : 'default'} size="md" />
                <Text token="micro" color={theme.colors.textMuted}>Custom</Text>
              </Pressable>
            </View>
            {avatarId === 'custom' ? (
              <Button label={customAvatarUri || profile?.customAvatarUrl ? 'Change custom photo' : 'Choose custom photo'} variant="secondary" size="sm" icon="image-outline" onPress={() => void pickTutorAvatar()} />
            ) : null}
            <Button label="Save avatar" variant="primary" loading={avatarBusy} onPress={() => void saveTutorAvatar()} fullWidth />
          </View>
        </Card> : null}

        <Card variant={activePlan === 'pro' ? 'raised' : 'premium'}>
          <View style={{ gap: theme.space[12] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
              <Ionicons name="star" size={20} color={theme.colors.premium} />
              <Text token="h3">{activePlan === 'pro' ? 'Pro plan' : 'Unlock Tutor Buddy Pro'}</Text>
            </View>
            <Text token="caption" color={theme.colors.textMuted}>
              {activePlan === 'pro' ? 'Manage your Pro access and view the included features.' : 'Unlimited students, recurring sessions, statements and more.'}
            </Text>
            <Button label={activePlan === 'pro' ? 'View Pro details' : 'Upgrade to Pro'} variant={activePlan === 'pro' ? 'secondary' : 'accent'} onPress={() => router.push('/upgrade' as never)} fullWidth />
          </View>
        </Card>

        <Card variant="flat" style={{ padding: theme.space[12] }}>
          <View style={{ gap: theme.space[8] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text token="micro" color={theme.colors.textSecondary}>Statements this month</Text>
              <Text token="caption" tabular>{isUnlimited ? `${used} · unlimited` : `${used} of ${limits.monthlyPdfs}`}</Text>
            </View>
            <ProgressBar value={quotaRatio} variant="quota" />
            <Text token="caption" color={theme.colors.textMuted}>{isUnlimited ? 'Pro: no monthly limit on statements.' : 'Free plan resets on the 1st. Pro removes the limit.'}</Text>
            <Button label="Refresh entitlement" variant="secondary" size="sm" loading={busy} onPress={handleRefresh} />
          </View>
        </Card>

        <View>
          <SectionHeader title="Tutor tools" />
          <Card variant="flat" padded={false}>
            <ListRow title="Expenses" subtitle="Track tutoring costs" leading={<AccountIcon name="wallet-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} showChevron onPress={() => router.push('/expenses' as never)} />
            <ListRow title="Recurring sessions" subtitle="Create and manage weekly session series" leading={<AccountIcon name="repeat-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} divider showChevron onPress={() => router.push('/recurring' as never)} />
            <ListRow title="Payments" subtitle="Record payments and view payment history" leading={<AccountIcon name="card-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} divider showChevron onPress={() => router.push('/payments' as never)} />
            <ListRow title="Earnings" subtitle="Monthly income and student balances" leading={<AccountIcon name="trending-up-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} showChevron onPress={() => router.push('/earnings' as never)} />
            <ListRow title="Statements" subtitle="Generate and view professional statements" leading={<AccountIcon name="document-text-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} showChevron onPress={() => router.push('/statements' as never)} />
            <ListRow title="Settings" subtitle="Manage notifications and app preferences" leading={<AccountIcon name="settings-outline" color={theme.colors.primary} backgroundColor={theme.colors.primarySubtle} />} divider showChevron onPress={() => router.push('/settings' as never)} />
          </Card>
        </View>

        <View>
          <SectionHeader title="Account" />
          <Card variant="raised">
            <View style={{ gap: theme.space[16] }}>
              <Button label="Sign out" icon="log-out-outline" variant="secondary" loading={deleting} onPress={handleSignOut} fullWidth />
              <Pressable
                onPress={confirmDeleteAccount}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Delete account permanently"
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12], paddingVertical: theme.space[8], opacity: deleting ? 0.5 : 1 }}
              >
                <AccountIcon name="trash-outline" color={theme.colors.danger} backgroundColor={theme.colors.dangerSubtle} />
                <View style={{ flex: 1, gap: theme.space[2] }}>
                  <Text token="bodyStrong" color={theme.colors.danger}>Delete account permanently</Text>
                  <Text token="caption" color={theme.colors.textMuted}>Remove your account and all recorded data.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textHint} />
              </Pressable>
            </View>
          </Card>
        </View>
      </View>

      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={cancelDeleteAccount}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: theme.colors.surfaceOverlay, justifyContent: 'center', padding: theme.space[20] }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close delete account confirmation"
            onPress={cancelDeleteAccount}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <Card variant="raised" style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
                <View style={{ gap: theme.space[16] }}>
                  <View style={{ gap: theme.space[4] }}>
                    <Text token="h2">Delete your account?</Text>
                    <Text token="body" color={theme.colors.textSecondary}>
                      This permanently removes your students, sessions, expenses, payments, statements, notifications, uploaded student photos, and sign-in account. This cannot be undone.
                    </Text>
                  </View>

                  <Text token="caption" color={theme.colors.textSecondary}>
                    Type <Text token="caption" color={theme.colors.danger} style={{ fontWeight: '700' }}>&quot;{DELETE_ACCOUNT_CONFIRMATION}&quot;</Text> to confirm.
                  </Text>
                  <TextField
                    label="Confirmation phrase"
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    placeholder={DELETE_ACCOUNT_CONFIRMATION}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={submitDeleteAccount}
                  />

                  <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
                    <View style={{ flex: 1 }}>
                      <Button label="Cancel" variant="secondary" onPress={cancelDeleteAccount} fullWidth />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Delete account"
                        variant="destructive"
                        disabled={deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION}
                        loading={deleting}
                        onPress={submitDeleteAccount}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
