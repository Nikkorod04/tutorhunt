import { doc, getDoc, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore';

import type { ContactPreference, ParentProfile } from '@/types';
import type { ServiceProvince } from '@/constants/locations';
import { getDb } from './firebase';

export interface ParentProfileInput {
  displayName: string;
  city: string;
  province: ServiceProvince;
  barangay: string;
  contactPreference: ContactPreference;
  contactValue: string;
  contactVisible: boolean;
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function profileRef(uid: string) {
  return doc(getDb(), 'parentProfiles', uid);
}

function mapParentProfile(uid: string, data: DocumentData): ParentProfile {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    city: typeof data.city === 'string' ? data.city : '',
    province: data.province === 'Samar' ? 'Samar' : 'Leyte',
    barangay: typeof data.barangay === 'string' ? data.barangay : '',
    contactPreference: data.contactPreference === 'phone' || data.contactPreference === 'email'
      ? data.contactPreference
      : 'messenger',
    contactValue: typeof data.contactValue === 'string' ? data.contactValue : '',
    contactVisible: data.contactVisible === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getParentProfile(uid: string): Promise<ParentProfile | null> {
  const snapshot = await getDoc(profileRef(uid));
  return snapshot.exists() ? mapParentProfile(uid, snapshot.data()) : null;
}

export async function upsertParentProfile(uid: string, input: ParentProfileInput): Promise<ParentProfile> {
  const ref = profileRef(uid);
  const current = await getDoc(ref);
  await setDoc(ref, {
    uid,
    ...input,
    createdAt: current.exists() ? current.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const saved = await getDoc(ref);
  if (!saved.exists()) throw new Error('Parent profile could not be saved.');
  return mapParentProfile(uid, saved.data());
}

export function parentProfileErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not save your profile. Please try again.';
}
