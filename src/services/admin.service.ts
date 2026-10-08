import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import type { Entitlement, UserProfile } from '@/types';
import { getDb, getFirebaseAuth } from './firebase';
import { fetchEntitlement, fetchUserProfile } from './auth.service';

export interface AdminUserRecord {
  profile: UserProfile;
  entitlement: Entitlement | null;
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  return fallback;
}

function mapProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role: (data.role ?? 'tutor') as UserProfile['role'],
    accountStatus: (data.accountStatus ?? 'active') as UserProfile['accountStatus'],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function watchAdminAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function isCurrentUserAdmin(user = getFirebaseAuth().currentUser): Promise<boolean> {
  if (!user) return false;
  const token = await getIdTokenResult(user, true);
  return token.claims.admin === true;
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const snapshot = await getDocs(collection(getDb(), 'users'));
  const records = await Promise.all(snapshot.docs.map(async (item) => {
    const profile = mapProfile(item.id, item.data() as Record<string, unknown>);
    return { profile, entitlement: await fetchEntitlement(profile.uid) };
  }));
  return records.sort((left, right) => left.profile.displayName.localeCompare(right.profile.displayName));
}

export async function activateProForUser(uid: string, proUntil: Date): Promise<void> {
  await updateDoc(doc(getDb(), 'entitlements', uid), {
    plan: 'pro',
    proUntil,
    trialEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeProForUser(uid: string): Promise<void> {
  await updateDoc(doc(getDb(), 'entitlements', uid), {
    plan: 'free',
    proUntil: null,
    trialEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function setAccountSuspended(uid: string, suspended: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), {
    accountStatus: suspended ? 'suspended' : 'active',
    updatedAt: serverTimestamp(),
  });
}

export async function adminUserById(uid: string): Promise<AdminUserRecord | null> {
  const profile = await fetchUserProfile(uid);
  if (!profile) return null;
  return { profile, entitlement: await fetchEntitlement(uid) };
}

export function adminErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Admin action failed. Please try again.';
}
