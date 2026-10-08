/**
 * Students. Blueprint sections 10, 11 and 7.3.
 *
 * The free-plan limit is enforced here, by a bounded query, at the two moments
 * that can breach it: creating a student, and restoring an archived one. It is
 * never read from a stored counter, because a counter drifts and — in v1.0 —
 * lived in a client-writable document.
 */

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { limitsFor } from '@/constants/plans';
import { getDb, getFileStorage } from './firebase';
import type { AvatarType, Plan, RateType, Student, StudentStatus } from '@/types';

export const STUDENT_PAGE_SIZE = 10;

/** Thrown when a create or restore would exceed the plan's active-student cap. */
export class StudentLimitError extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super(
      limit === 1
        ? 'The free plan allows 1 active student.'
        : `The free plan allows ${limit} active students.`,
    );
    this.name = 'StudentLimitError';
    this.limit = limit;
  }
}

function studentsCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'students');
}

function toDate(value: unknown, fallback: Date = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const parsed = toDate(value, new Date(Number.NaN));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapStudent(id: string, data: DocumentData): Student {
  return {
    id,
    nickname: typeof data.nickname === 'string' ? data.nickname : '',
    avatarType: (data.avatarType ?? 'neutral') as AvatarType,
    customAvatarUrl: typeof data.customAvatarUrl === 'string' ? data.customAvatarUrl : null,
    birthday: toDateOrNull(data.birthday),
    school: typeof data.school === 'string' ? data.school : '',
    gradeLevel: typeof data.gradeLevel === 'string' ? data.gradeLevel : '',
    parentGuardianName:
      typeof data.parentGuardianName === 'string' ? data.parentGuardianName : '',
    parentContact: typeof data.parentContact === 'string' ? data.parentContact : '',
    tutoringPlace: typeof data.tutoringPlace === 'string' ? data.tutoringPlace : '',
    rateType: (data.rateType ?? 'hourly') as RateType,
    defaultRate: typeof data.defaultRate === 'number' ? data.defaultRate : 0,
    notes: typeof data.notes === 'string' ? data.notes : '',
    status: (data.status ?? 'active') as StudentStatus,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Limit enforcement
// ---------------------------------------------------------------------------

/**
 * The bounded query from section 7.3. Asks for one more than the cap, so a
 * single read answers "is there room?" without counting the whole collection.
 * For a Free tutor that is at most 3 document reads.
 */
export async function canAddActiveStudent(tutorUid: string, plan: Plan): Promise<boolean> {
  const cap = limitsFor(plan).maxActiveStudents;
  if (!Number.isFinite(cap)) return true;

  const snapshot = await getDocs(
    query(studentsCol(tutorUid), where('status', '==', 'active'), fsLimit(cap + 1)),
  );

  return snapshot.size < cap;
}

/**
 * Exact active count for display. Uses a server-side aggregation, which bills
 * as one read per 1,000 documents matched, so it stays cheap even for a Pro
 * tutor with a large roster. This is still a derivation — nothing is stored.
 */
export async function countActiveStudents(tutorUid: string): Promise<number> {
  const snapshot = await getCountFromServer(
    query(studentsCol(tutorUid), where('status', '==', 'active')),
  );
  return snapshot.data().count;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface StudentPage {
  items: Student[];
  /** Pass back to fetch the next page. Null when the page was empty. */
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ListStudentsOptions {
  status?: StudentStatus;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * Paginated list, ordered by nickname. The order is fixed and documented, as
 * every paginated list must be (blueprint section 44).
 */
export async function listStudents(
  tutorUid: string,
  { status, pageSize = STUDENT_PAGE_SIZE, cursor = null }: ListStudentsOptions = {},
): Promise<StudentPage> {
  const constraints: QueryConstraint[] = [];

  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('nickname'));
  if (cursor) constraints.push(startAfter(cursor));

  // One extra document tells us whether another page exists without a second query.
  const snapshot = await getDocs(
    query(studentsCol(tutorUid), ...constraints, fsLimit(pageSize + 1)),
  );

  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    items: pageDocs.map((d) => mapStudent(d.id, d.data())),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

export async function getStudent(tutorUid: string, studentId: string): Promise<Student | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', tutorUid, 'students', studentId));
  if (!snapshot.exists()) return null;
  return mapStudent(snapshot.id, snapshot.data());
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface StudentInput {
  nickname: string;
  avatarType: AvatarType;
  customAvatarUrl: string | null;
  /** Local picker URI. Uploaded by this service and never written to Firestore. */
  customAvatarLocalUri?: string | null;
  customAvatarMimeType?: string | null;
  birthday: Date | null;
  school: string;
  gradeLevel: string;
  parentGuardianName: string;
  parentContact: string;
  tutoringPlace: string;
  rateType: RateType;
  defaultRate: number;
  notes: string;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function uploadStudentAvatar(
  tutorUid: string,
  studentId: string,
  uri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected photo.');
  const blob = await response.blob();
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error('Choose a photo smaller than 5 MB.');
  }

  const avatarRef = ref(getFileStorage(), `users/${tutorUid}/students/${studentId}/avatar`);
  await uploadBytes(avatarRef, blob, { contentType: mimeType });
  return getDownloadURL(avatarRef);
}

async function removeAvatar(url: string | null): Promise<void> {
  if (!url) return;
  try {
    await deleteObject(ref(getFileStorage(), url));
  } catch {
    // A missing/stale object must not stop a tutor from changing avatars.
  }
}

function persistedStudentInput(input: StudentInput, customAvatarUrl: string | null) {
  const { customAvatarLocalUri: _uri, customAvatarMimeType: _mime, ...persisted } = input;
  return { ...persisted, customAvatarUrl };
}

/**
 * Creates a student. Throws StudentLimitError when the plan cap is reached, so
 * the caller can surface the upgrade prompt rather than a generic failure.
 */
export async function createStudent(
  tutorUid: string,
  plan: Plan,
  input: StudentInput,
): Promise<{ id: string; customAvatarUrl: string | null }> {
  if (!(await canAddActiveStudent(tutorUid, plan))) {
    throw new StudentLimitError(limitsFor(plan).maxActiveStudents);
  }

  const ref = doc(studentsCol(tutorUid));

  let uploadedUrl: string | null = null;
  if (input.avatarType === 'custom' && input.customAvatarLocalUri) {
    uploadedUrl = await uploadStudentAvatar(
      tutorUid,
      ref.id,
      input.customAvatarLocalUri,
      input.customAvatarMimeType ?? 'image/jpeg',
    );
  }

  try {
    await setDoc(ref, {
      id: ref.id,
      ...persistedStudentInput(input, uploadedUrl),
      status: 'active' satisfies StudentStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await removeAvatar(uploadedUrl);
    throw error;
  }

  return { id: ref.id, customAvatarUrl: uploadedUrl };
}

export async function updateStudent(
  tutorUid: string,
  studentId: string,
  input: StudentInput,
): Promise<string | null> {
  const studentRef = doc(getDb(), 'users', tutorUid, 'students', studentId);
  const current = await getDoc(studentRef);
  const previousUrl = current.exists() && typeof current.data().customAvatarUrl === 'string'
    ? current.data().customAvatarUrl as string
    : null;

  let nextUrl = input.avatarType === 'custom' ? input.customAvatarUrl : null;
  if (input.avatarType === 'custom' && input.customAvatarLocalUri) {
    nextUrl = await uploadStudentAvatar(
      tutorUid,
      studentId,
      input.customAvatarLocalUri,
      input.customAvatarMimeType ?? 'image/jpeg',
    );
  }

  await updateDoc(studentRef, {
    ...persistedStudentInput(input, nextUrl),
    updatedAt: serverTimestamp(),
  });

  if (previousUrl && previousUrl !== nextUrl) await removeAvatar(previousUrl);
  return nextUrl;
}

/**
 * Archives rather than deletes. Student records are never destroyed — sessions,
 * payments and statements reference them, and the blueprint requires that data
 * survive a plan downgrade.
 */
export async function archiveStudent(tutorUid: string, studentId: string): Promise<void> {
  await updateDoc(doc(getDb(), 'users', tutorUid, 'students', studentId), {
    status: 'archived' satisfies StudentStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Restores an archived student, re-checking the cap because it counts again. */
export async function restoreStudent(
  tutorUid: string,
  studentId: string,
  plan: Plan,
): Promise<void> {
  if (!(await canAddActiveStudent(tutorUid, plan))) {
    throw new StudentLimitError(limitsFor(plan).maxActiveStudents);
  }

  await updateDoc(doc(getDb(), 'users', tutorUid, 'students', studentId), {
    status: 'active' satisfies StudentStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Marks a student inactive without archiving them. Does not free a slot. */
export async function setStudentInactive(tutorUid: string, studentId: string): Promise<void> {
  await updateDoc(doc(getDb(), 'users', tutorUid, 'students', studentId), {
    status: 'inactive' satisfies StudentStatus,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function studentErrorMessage(error: unknown): string {
  if (error instanceof StudentLimitError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
