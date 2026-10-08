import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { Avatar, Button, Card, Chip, EmptyState, ListRow, Screen, Text, TextField } from '@/components/ui';
import { activePlanFor } from '@/constants/plans';
import { adminErrorMessage, activateProForUser, isCurrentUserAdmin, listAdminUsers, revokeProForUser, setAccountSuspended, watchAdminAuth, type AdminUserRecord } from '@/services/admin.service';
import { getFirebaseAuth } from '@/services/firebase';
import { useTheme } from '@/theme';

const ACCESS_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
] as const;

function futureDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export default function AdminScreen() {
  const theme = useTheme();
  const [authUser, setAuthUser] = useState(getFirebaseAuth().currentUser);
  const [admin, setAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function load() { setLoading(true); try { setUsers(await listAdminUsers()); setError(null); } catch (caught) { setError(adminErrorMessage(caught)); } finally { setLoading(false); } }
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
    try { setUsers(await listAdminUsers()); } catch (caught) { setError(adminErrorMessage(caught)); } finally { setBusy(false); }
  }

  async function activate(days: number) {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await activateProForUser(selected.profile.uid, futureDate(days)); await refresh(); } catch (caught) { setError(adminErrorMessage(caught)); setBusy(false); }
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

  if (!authUser) return <Screen scroll><View style={{ maxWidth: 520, width: '100%', alignSelf: 'center', paddingTop: theme.space[48], gap: theme.space[20] }}><Text token="h1">Tutor Hunt Admin</Text><Text token="body" color={theme.colors.textMuted}>Private administration access.</Text><Card variant="raised"><View style={{ gap: theme.space[16] }}><TextField label="Admin email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={login} />{error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : null}<Button label="Sign in" fullWidth loading={busy} onPress={login} /></View></Card></View></Screen>;
  if (!admin) return <Screen scroll><EmptyState icon="lock-closed-outline" title="Admin access required" description="This account is not enabled for Tutor Hunt administration." action={<Button label="Sign out" variant="secondary" onPress={() => void signOut(getFirebaseAuth())} />} /></Screen>;
  return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16], maxWidth: 760, width: '100%', alignSelf: 'center' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text token="h1">Tutor Hunt Admin</Text><Text token="caption" color={theme.colors.textMuted}>Users, Pro access and account safety.</Text></View><Button label="Sign out" size="sm" variant="ghost" onPress={() => void signOut(getFirebaseAuth())} /></View><TextField label="Search users" value={search} onChangeText={setSearch} placeholder="Name or email" icon="search-outline" />{error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}<Card variant="flat" padded={false}>{visibleUsers.length === 0 ? <EmptyState icon="people-outline" title={loading ? 'Loading users…' : 'No users found'} /> : visibleUsers.map(({ profile, entitlement }, index) => <ListRow key={profile.uid} title={profile.displayName || 'Unnamed user'} subtitle={`${profile.email} · ${activePlanFor(entitlement) === 'pro' ? 'Pro' : 'Free'} · ${profile.accountStatus}`} leading={<Avatar name={profile.displayName} size="sm" />} trailing={<Chip label={selectedUid === profile.uid ? 'Selected' : profile.role} variant="status" tone={selectedUid === profile.uid ? 'info' : 'neutral'} />} divider={index < visibleUsers.length - 1} onPress={() => setSelectedUid(profile.uid)} />)}</Card>{selected ? <Card variant="raised"><View style={{ gap: theme.space[12] }}><Text token="h3">Manage {selected.profile.displayName || selected.profile.email}</Text><Text token="caption" color={theme.colors.textMuted}>{selected.profile.email}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{ACCESS_OPTIONS.map((option) => <Button key={option.days} label={`Grant ${option.label}`} size="sm" loading={busy} onPress={() => void activate(option.days)} />)}</View><Button label="Revoke Pro" variant="destructive" size="sm" loading={busy} onPress={() => void revoke()} /><Button label={selected.profile.accountStatus === 'suspended' ? 'Restore account' : 'Suspend account'} variant="secondary" loading={busy} onPress={() => void toggleSuspension()} /><Button label="Refresh users" variant="ghost" size="sm" loading={busy} onPress={() => void refresh()} /></View></Card> : null}</View></Screen>;
}
