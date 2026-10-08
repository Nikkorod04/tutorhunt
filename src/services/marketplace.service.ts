import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { TutorFavorite, TutorProfile, TutoringMode } from '@/types';
import { getDb } from './firebase';

export const TUTOR_PROFILE_PAGE_SIZE = 15;
export type TutorFilterKind = 'subject' | 'grade' | 'mode' | 'rate' | 'verified' | 'barangay';

export interface TutorProfileFilter {
  kind: TutorFilterKind;
  value: string;
}

export interface TutorProfilePage {
  items: TutorProfile[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ListTutorProfilesOptions {
  city?: string;
  filter?: TutorProfileFilter | null;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function mapTutorProfile(uid: string, data: DocumentData): TutorProfile {
  const modes = stringArray(data.tutoringModes).filter(
    (mode): mode is TutoringMode => mode === 'face_to_face' || mode === 'online',
  );
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
    tutoringModes: modes.length > 0 ? modes : ['online'],
    rateFrom: typeof data.rateFrom === 'number' ? data.rateFrom : null,
    minRate: typeof data.minRate === 'number' ? data.minRate : null,
    maxRate: typeof data.maxRate === 'number' ? data.maxRate : null,
    education: typeof data.education === 'string' ? data.education : '',
    experienceSummary: typeof data.experienceSummary === 'string' ? data.experienceSummary : '',
    contactPreference: data.contactPreference === 'phone' || data.contactPreference === 'email' ? data.contactPreference : 'messenger',
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

function mapFavorite(id: string, data: DocumentData): TutorFavorite {
  return {
    tutorUid: typeof data.tutorUid === 'string' ? data.tutorUid : id,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Tutor',
    profilePhotoUrl: typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : null,
    subjects: stringArray(data.subjects),
    city: typeof data.city === 'string' ? data.city : '',
    rateFrom: typeof data.rateFrom === 'number' ? data.rateFrom : null,
    snapshotAt: toDate(data.snapshotAt),
    createdAt: toDate(data.createdAt),
  };
}

function favoritesCollection(parentUid: string) {
  return collection(getDb(), 'users', parentUid, 'favorites');
}

export async function listTutorProfiles({ city, filter, pageSize = TUTOR_PROFILE_PAGE_SIZE, cursor = null }: ListTutorProfilesOptions = {}): Promise<TutorProfilePage> {
  const constraints: QueryConstraint[] = [where('isVisible', '==', true)];
  const normalizedCity = city?.trim();
  if (!normalizedCity) throw new Error('Choose a city to browse tutors.');
  constraints.push(where('city', '==', normalizedCity));

  if (filter) {
    if (filter.kind === 'subject' && filter.value) constraints.push(where('subjects', 'array-contains', filter.value));
    if (filter.kind === 'grade' && filter.value) constraints.push(where('gradeBand', '==', filter.value));
    if (filter.kind === 'mode' && filter.value) constraints.push(where('primaryMode', '==', filter.value));
    if (filter.kind === 'rate') {
      const maximum = Number(filter.value);
      if (Number.isFinite(maximum)) constraints.push(where('rateFrom', '<=', maximum));
    }
    if (filter.kind === 'verified') constraints.push(where('credentialsVerified', '==', true));
    if (filter.kind === 'barangay' && filter.value) constraints.push(where('barangaysServed', 'array-contains', filter.value));
  }

  constraints.push(orderBy('updatedAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  const snapshot = await getDocs(query(collection(getDb(), 'tutorProfiles'), ...constraints, fsLimit(pageSize + 1)));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    items: pageDocs.map((item) => mapTutorProfile(item.id, item.data())),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

export async function getMarketplaceTutor(tutorUid: string): Promise<TutorProfile | null> {
  const snapshot = await getDoc(doc(getDb(), 'tutorProfiles', tutorUid));
  return snapshot.exists() ? mapTutorProfile(snapshot.id, snapshot.data()) : null;
}

export interface FavoritePage {
  items: TutorFavorite[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listFavorites(parentUid: string, cursor: QueryDocumentSnapshot<DocumentData> | null = null, pageSize = TUTOR_PROFILE_PAGE_SIZE): Promise<FavoritePage> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  const snapshot = await getDocs(query(favoritesCollection(parentUid), ...constraints, fsLimit(pageSize + 1)));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    items: pageDocs.map((item) => mapFavorite(item.id, item.data())),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

export async function getFavorite(parentUid: string, tutorUid: string): Promise<TutorFavorite | null> {
  const snapshot = await getDoc(doc(favoritesCollection(parentUid), tutorUid));
  return snapshot.exists() ? mapFavorite(snapshot.id, snapshot.data()) : null;
}

/** Loads saved ids in one collection read so marketplace cards do not perform one read per tutor. */
export async function getFavoriteIds(parentUid: string): Promise<Set<string>> {
  const snapshot = await getDocs(favoritesCollection(parentUid));
  return new Set(snapshot.docs.map((item) => item.id));
}

export async function saveFavorite(parentUid: string, tutor: TutorProfile): Promise<void> {
  const ref = doc(favoritesCollection(parentUid), tutor.uid);
  const current = await getDoc(ref);
  await setDoc(ref, {
    tutorUid: tutor.uid,
    displayName: tutor.displayName,
    profilePhotoUrl: tutor.profilePhotoUrl,
    subjects: tutor.subjects,
    city: tutor.city,
    rateFrom: tutor.rateFrom,
    snapshotAt: serverTimestamp(),
    createdAt: current.exists() ? current.data().createdAt : serverTimestamp(),
  });
}

export async function removeFavorite(parentUid: string, tutorUid: string): Promise<void> {
  await deleteDoc(doc(favoritesCollection(parentUid), tutorUid));
}

export function marketplaceErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load the marketplace. Please try again.';
}
