/** Public tutor profile CRUD. Private tutoring records never leave users/{uid}. */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';

import type {
  ContactPreference,
  TutorProfile,
  TutoringMode,
} from '@/types';
import { locationForCity, type ServiceProvince } from '@/constants/locations';
import { getDb } from './firebase';

export interface TutorProfileInput {
  displayName: string;
  profilePhotoUrl: string | null;
  shortBio: string;
  subjects: string[];
  gradeLevels: string[];
  primarySubject: string;
  gradeBand: string;
  city: string;
  province: ServiceProvince;
  barangaysServed: string[];
  servesAllBarangays: boolean;
  areasServed: string[];
  primaryMode: TutoringMode;
  tutoringModes: TutoringMode[];
  rateFrom: number | null;
  minRate: number | null;
  maxRate: number | null;
  education: string;
  experienceSummary: string;
  contactPreference: ContactPreference;
  contactValue: string;
  isVisible: boolean;
}

function profileRef(uid: string) {
  return doc(getDb(), 'tutorProfiles', uid);
}

function toDate(value: unknown, fallback: Date = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (
    value !== null
    && typeof value === 'object'
    && 'toDate' in value
    && typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function mapTutorProfile(uid: string, data: DocumentData): TutorProfile {
  const modes = stringArray(data.tutoringModes).filter(
    (mode): mode is TutoringMode => mode === 'face_to_face' || mode === 'online',
  );
  const tutoringModes: TutoringMode[] = modes.length > 0 ? modes : ['online'];

  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    profilePhotoUrl: typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : null,
    shortBio: typeof data.shortBio === 'string' ? data.shortBio : '',
    subjects: stringArray(data.subjects),
    gradeLevels: stringArray(data.gradeLevels),
    primarySubject: typeof data.primarySubject === 'string' ? data.primarySubject : '',
    gradeBand: typeof data.gradeBand === 'string' ? data.gradeBand : '',
    city: typeof data.city === 'string' ? data.city : '',
    province: data.province === 'Samar' ? 'Samar' : 'Leyte',
    barangaysServed: stringArray(data.barangaysServed),
    servesAllBarangays: typeof data.servesAllBarangays === 'boolean' ? data.servesAllBarangays : true,
    areasServed: stringArray(data.areasServed),
    primaryMode: data.primaryMode === 'face_to_face' ? 'face_to_face' : 'online',
    tutoringModes,
    rateFrom: typeof data.rateFrom === 'number' ? data.rateFrom : null,
    minRate: typeof data.minRate === 'number' ? data.minRate : null,
    maxRate: typeof data.maxRate === 'number' ? data.maxRate : null,
    education: typeof data.education === 'string' ? data.education : '',
    experienceSummary: typeof data.experienceSummary === 'string' ? data.experienceSummary : '',
    contactPreference: data.contactPreference === 'phone' || data.contactPreference === 'email'
      ? data.contactPreference
      : 'messenger',
    contactValue: typeof data.contactValue === 'string' ? data.contactValue : '',
    rating: typeof data.rating === 'number' ? data.rating : 0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    identityVerified: data.identityVerified === true,
    credentialsVerified: data.credentialsVerified === true,
    isVisible: data.isVisible === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getTutorProfile(uid: string): Promise<TutorProfile | null> {
  const snapshot = await getDoc(profileRef(uid));
  return snapshot.exists() ? mapTutorProfile(uid, snapshot.data()) : null;
}

export async function upsertTutorProfile(uid: string, input: TutorProfileInput): Promise<TutorProfile> {
  const ref = profileRef(uid);
  const current = await getDoc(ref);
  const currentData = current.exists() ? current.data() : null;
  const createdAt = currentData?.createdAt ?? serverTimestamp();
  const trustFields = {
    rating: typeof currentData?.rating === 'number' ? currentData.rating : 0,
    reviewCount: typeof currentData?.reviewCount === 'number' ? currentData.reviewCount : 0,
    identityVerified: currentData?.identityVerified === true,
    credentialsVerified: currentData?.credentialsVerified === true,
  };

  const location = locationForCity(input.city);
  const persistedBarangays = input.servesAllBarangays
    ? location?.barangays ?? input.barangaysServed
    : input.barangaysServed;

  await setDoc(ref, {
    uid,
    ...input,
    barangaysServed: persistedBarangays,
    createdAt,
    updatedAt: serverTimestamp(),
    ...trustFields,
  });

  const saved = await getDoc(ref);
  if (!saved.exists()) throw new Error('Tutor profile could not be saved.');
  return mapTutorProfile(uid, saved.data());
}

export function tutorProfileErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not save the public profile. Please try again.';
}
