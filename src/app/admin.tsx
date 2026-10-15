import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, type TextInput } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { Avatar, Button, Card, Chip, EmptyState, ListRow, Screen, Text, TextField } from '@/components/ui';
import { activePlanFor, PRICING } from '@/constants/plans';
import { announcementErrorMessage, createAnnouncement, deleteAnnouncement, listAdminAnnouncements } from '@/services/announcements.service';
import { adminErrorMessage, activateProForUser, isCurrentUserAdmin, listAdminUsers, revokeProForUser, setAccountSuspended, watchAdminAuth, type AdminUserRecord } from '@/services/admin.service';
import { getFirebaseAuth } from '@/services/firebase';
import type { Announcement } from '@/types';
import { useTheme } from '@/theme';
import { formatDisplayDateTime } from '@/utils/date';

const ACCESS_OPTIONS = PRICING.options.map((option) => ({
  label: option.label,
  days: option.days,
}));

function futureDate(days: number, from = new Date()): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

export default function AdminScreen() {
  const theme = useTheme();
  const [authUser, setAuthUser] = useState(getFirebaseAuth().currentUser);
  const [admin, setAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adminEmailRef = useRef<TextInput>(null);
  const adminPasswordRef = useRef<TextInput>(null);

  useEffect(() => watchAdminAuth((user) => { setAuthUser(user); if (!user) { setAdmin(false); setUsers([]); } }), []);
  useEffect(() => {
    async function verify() {
      if (!authUser) { setLoading(false); return; }
      setLoading(true);
      try { setAdmin(await isCurrentUserAdmin(authUser)); } catch (caught) { setError(adminErrorMessage(caught)); } finally { setLoading(false); }
    }
    void verify();
  }, [authUser]);
  useEffect(() => {
    if (!admin) return;
    async function load() {
      setLoading(true);
      try {
        const [nextUsers, nextAnnouncements] = await Promise.all([listAdminUsers(), listAdminAnnouncements()]);
        setUsers(nextUsers);
        setAnnouncements(nextAnnouncements);
        setError(null);
      } catch (caught) { setError(adminErrorMessage(caught)); }
      finally { setLoading(false); }
    }
    void load();
  }, [admin]);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(({ profile }) => `${profile.displayName} ${profile.email}`.toLowerCase().includes(query));
  }, [search, users]);
  const selected = users.find(({ profile }) => profile.uid === selectedUid) ?? null;

  async function login() {
    setBusy(true); setError(null);
    try { await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password); } catch (caught) { setError(adminErrorMessage(caught)); } finally { setBusy(false); }
  }

  async function refresh() {
    setBusy(true); setError(null);
    try {
      const [nextUsers, nextAnnouncements] = await Promise.all([listAdminUsers(), listAdminAnnouncements()]);
      setUsers(nextUsers);
      setAnnouncements(nextAnnouncements);
    } catch (caught) { setError(adminErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function postAnnouncement() {
    if (!authUser) return;
    setBusy(true); setError(null);
    try {
      await createAnnouncement(authUser.uid, announcementTitle, announcementMessage);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      await refresh();
    } catch (caught) {
      setError(announcementErrorMessage(caught));
      setBusy(false);
    }
  }

  function confirmDeleteAnnouncement(announcement: Announcement) {
    Alert.alert(
      'Delete announcement?',
      'This removes the announcement from every user’s notification list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true); setError(null);
              try {
                await deleteAnnouncement(announcement.id);
                await refresh();
              } catch (caught) {
                setError(announcementErrorMessage(caught));
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function activate(days: number) {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const now = new Date();
      const currentUntil = selected.entitlement?.proUntil;
      const base = activePlanFor(selected.entitlement) === 'pro' && currentUntil && currentUntil > now
        ? currentUntil
        : now;
      await activateProForUser(selected.profile.uid, futureDate(days, base));
      await refresh();
    } catch (caught) { setError(adminErrorMessage(caught)); setBusy(false); }
  }

  async function revoke() {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await revokeProForUser(selected.profile.uid); await refresh(); } catch (caught) { setError(adminErrorMessage(caught)); setBusy(false); }
  }

  async function toggleSuspension() {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await setAccountSuspended(selected.profile.uid, selected.profile.accountStatus !== 'suspended'); await refresh(); } catch (caught) { setError(adminErrorMessage(caught)); setBusy(false); }
  }

  if (!authUser) return <Screen scroll><View style={{ maxWidth: 520, width: '100%', alignSelf: 'center', paddingTop: theme.space[48], gap: theme.space[20] }}><Text token="h1">Tutor Buddy Admin</Text><Text token="body" color={theme.colors.textMuted}>Private administration access.</Text><Card variant="raised"><View style={{ gap: theme.space[16] }}><TextField label="Admin email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" inputRef={adminEmailRef} returnKeyType="next" onSubmitEditing={() => adminPasswordRef.current?.focus()} /><TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry inputRef={adminPasswordRef} returnKeyType="done" onSubmitEditing={login} />{error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : null}<Button label="Sign in" fullWidth loading={busy} onPress={login} /></View></Card></View></Screen>;
  if (!admin) return <Screen scroll><EmptyState icon="lock-closed-outline" title="Admin access required" description="This account is not enabled for Tutor Buddy administration." action={<Button label="Sign out" variant="secondary" onPress={() => void signOut(getFirebaseAuth())} />} /></Screen>;
  return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16], maxWidth: 760, width: '100%', alignSelf: 'center' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text token="h1">Tutor Buddy Admin</Text><Text token="caption" color={theme.colors.textMuted}>Users, Pro access and account safety.</Text></View><Button label="Sign out" size="sm" variant="ghost" onPress={() => void signOut(getFirebaseAuth())} /></View><Card variant="raised"><View style={{ gap: theme.space[12] }}><View><Text token="h3">Post announcement</Text><Text token="caption" color={theme.colors.textMuted}>This will appear in every tutor’s Notifications page.</Text></View><TextField label="Title" value={announcementTitle} onChangeText={setAnnouncementTitle} placeholder="e.g. New Tutor Buddy update" maxLength={120} showCounter returnKeyType="next" /><TextField label="Announcement" value={announcementMessage} onChangeText={setAnnouncementMessage} placeholder="Write your announcement…" multiline maxLength={4000} showCounter /><Button label="Post announcement" icon="megaphone-outline" loading={busy} onPress={() => void postAnnouncement()} /></View></Card><Card variant="flat" padded={false}><View style={{ padding: theme.layout.cardPadding, gap: theme.space[4] }}><Text token="h3">Announcements</Text><Text token="caption" color={theme.colors.textMuted}>They stay visible until you delete them.</Text></View>{announcements.length === 0 ? <EmptyState icon="megaphone-outline" title="No announcements yet" description="Posted announcements will appear here." /> : announcements.map((announcement, index) => <View key={announcement.id} style={{ padding: theme.layout.cardPadding, gap: theme.space[8], borderTopWidth: index === 0 ? 0 : 0.5, borderTopColor: theme.colors.borderSubtle }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}><View style={{ flex: 1, gap: theme.space[4] }}><Text token="bodyStrong">{announcement.title}</Text><Text token="caption" color={theme.colors.textMuted}>{announcement.message}</Text><Text token="micro" color={theme.colors.textHint}>{formatDisplayDateTime(announcement.createdAt)}</Text></View><Button label="Delete" icon="trash-outline" variant="destructive" size="sm" loading={busy} onPress={() => confirmDeleteAnnouncement(announcement)} /></View></View>)}</Card>{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<TextField label="Search users" value={search} onChangeText={setSearch} placeholder="Name or email" icon="search-outline" /> <Card variant="flat" padded={false}>{visibleUsers.length === 0 ? <EmptyState icon="people-outline" title={loading ? 'Loading users…' : 'No users found'} /> : visibleUsers.map(({ profile, entitlement }, index) => <ListRow key={profile.uid} title={profile.displayName || 'Unnamed user'} subtitle={`${profile.email} · ${activePlanFor(entitlement) === 'pro' ? 'Pro' : 'Free'} · ${profile.accountStatus}`} leading={<Avatar name={profile.displayName} imageUrl={profile.avatarId === 'custom' ? profile.customAvatarUrl : null} builtin={profile.avatarId === 'custom' ? 'default' : profile.avatarId} size="sm" />} trailing={<Chip label={selectedUid === profile.uid ? 'Selected' : profile.role} variant="status" tone={selectedUid === profile.uid ? 'info' : 'neutral'} />} divider={index < visibleUsers.length - 1} onPress={() => setSelectedUid(profile.uid)} />)}</Card>{selected ? <Card variant="raised"><View style={{ gap: theme.space[12] }}><Text token="h3">Manage {selected.profile.displayName || selected.profile.email}</Text><Text token="caption" color={theme.colors.textMuted}>{selected.profile.email}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{ACCESS_OPTIONS.map((option) => <Button key={option.days} label={`Grant ${option.label}`} size="sm" loading={busy} onPress={() => void activate(option.days)} />)}</View><Button label="Revoke Pro" variant="destructive" size="sm" loading={busy} onPress={() => void revoke()} /><Button label={selected.profile.accountStatus === 'suspended' ? 'Restore account' : 'Suspend account'} variant="secondary" loading={busy} onPress={() => void toggleSuspension()} /><Button label="Refresh users" variant="ghost" size="sm" loading={busy} onPress={() => void refresh()} /></View></Card> : null}</View></Screen>;
}
