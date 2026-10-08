/** Session CRUD and pagination. Blueprint sections 12, 13 and Phase 3. */

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
  updateDoc,
  writeBatch,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { RateType, Session, SessionStatus, TopicCategory } from '@/types';
import {
  canOverrideBillable,
  computeDurationMinutes,
  computeSessionFee,
  defaultBillableFor,
} from '@/utils/pricing';
import { getDb } from './firebase';

export const SESSION_PAGE_SIZE = 10;
export type EditableSessionStatus = Exclude<SessionStatus, 'rescheduled'>;

export interface SessionInput {
  studentId: string;
  startsAt: Date;
  endsAt: Date;
  subject: string;
  topicCategory: TopicCategory;
  topicDetails: string;
  notes: string;
  rateType: RateType;
  appliedRate: number;
  status: EditableSessionStatus;
  billable: boolean;
}

function sessionsCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'sessions');
}

function toDate(value: unknown, fallback: Date = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    // Keep the Timestamp receiver intact. Firebase's toDate() calls
    // this.toMillis(), so extracting the method first breaks native reads.
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function mapSession(id: string, data: DocumentData): Session {
  return {
    id,
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 0,
    subject: typeof data.subject === 'string' ? data.subject : '',
    topicCategory: (data.topicCategory ?? 'other') as TopicCategory,
    topicDetails: typeof data.topicDetails === 'string' ? data.topicDetails : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    rateType: (data.rateType ?? 'hourly') as RateType,
    appliedRate: typeof data.appliedRate === 'number' ? data.appliedRate : 0,
    sessionFee: typeof data.sessionFee === 'number' ? data.sessionFee : 0,
    billable: data.billable === true,
    status: (data.status ?? 'scheduled') as SessionStatus,
    rescheduledToId: typeof data.rescheduledToId === 'string' ? data.rescheduledToId : null,
    recurringGroupId: typeof data.recurringGroupId === 'string' ? data.recurringGroupId : null,
    recurringSessionModified: data.recurringSessionModified === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function derivedInput(input: SessionInput) {
  const durationMinutes = computeDurationMinutes(input.startsAt, input.endsAt);
  if (!input.studentId.trim()) throw new Error('Choose a student.');
  if (!input.subject.trim()) throw new Error('A subject is required.');
  if (!Number.isFinite(input.appliedRate) || input.appliedRate < 0) {
    throw new Error('Rate cannot be negative.');
  }
  if (durationMinutes <= 0) throw new Error('End time must be after start time.');
  const sessionFee = computeSessionFee({
    rateType: input.rateType,
    appliedRate: input.appliedRate,
    durationMinutes,
  });
  const billable = defaultBillableFor(input.status)
    || (canOverrideBillable(input.status) && input.billable);
  return { ...input, durationMinutes, sessionFee, billable };
}

/** Shared by recurring-series writes so generated sessions use the same fee
 * and billable rules as a manually created session. */
export function deriveSessionInput(input: SessionInput) {
  return derivedInput(input);
}

export interface SessionPage {
  items: Session[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ListSessionsOptions {
  studentId?: string;
  status?: SessionStatus;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

export async function listSessions(
  tutorUid: string,
  { studentId, status, pageSize = SESSION_PAGE_SIZE, cursor = null }: ListSessionsOptions = {},
): Promise<SessionPage> {
  const constraints: QueryConstraint[] = [];
  if (studentId) constraints.push(where('studentId', '==', studentId));
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('startsAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(fsLimit(pageSize + 1));

  const snapshot = await getDocs(query(sessionsCol(tutorUid), ...constraints));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    items: pageDocs.map((item) => mapSession(item.id, item.data())),
    cursor: pageDocs.at(-1) ?? null,
    hasMore,
  };
}

/** Full session read used by the earnings ledger. */
export async function listAllSessions(tutorUid: string): Promise<Session[]> {
  const snapshot = await getDocs(query(sessionsCol(tutorUid), orderBy('startsAt', 'desc')));
  return snapshot.docs.map((item) => mapSession(item.id, item.data()));
}

export async function getSession(tutorUid: string, sessionId: string): Promise<Session | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', tutorUid, 'sessions', sessionId));
  return snapshot.exists() ? mapSession(snapshot.id, snapshot.data()) : null;
}

export async function createSession(tutorUid: string, input: SessionInput): Promise<string> {
  const ref = doc(sessionsCol(tutorUid));
  await setDoc(ref, {
    id: ref.id,
    ...derivedInput(input),
    rescheduledToId: null,
    recurringGroupId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSession(
  tutorUid: string,
  sessionId: string,
  input: SessionInput,
): Promise<void> {
  await updateDoc(doc(getDb(), 'users', tutorUid, 'sessions', sessionId), {
    ...derivedInput(input),
    rescheduledToId: null,
    recurringSessionModified: true,
    updatedAt: serverTimestamp(),
  });
}

export async function markSessionRescheduled(
  tutorUid: string,
  originalId: string,
  replacementId: string,
): Promise<void> {
  await updateDoc(doc(getDb(), 'users', tutorUid, 'sessions', originalId), {
    status: 'rescheduled' satisfies SessionStatus,
    billable: false,
    rescheduledToId: replacementId,
    updatedAt: serverTimestamp(),
  });
}

/** Creates the replacement and links the original in one atomic write. */
export async function rescheduleSession(
  tutorUid: string,
  originalId: string,
  replacement: SessionInput,
): Promise<string> {
  const replacementRef = doc(sessionsCol(tutorUid));
  const originalRef = doc(getDb(), 'users', tutorUid, 'sessions', originalId);
  const batch = writeBatch(getDb());
  batch.set(replacementRef, {
    id: replacementRef.id,
    ...derivedInput({ ...replacement, status: 'scheduled', billable: false }),
    rescheduledToId: null,
    recurringGroupId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(originalRef, {
    status: 'rescheduled' satisfies SessionStatus,
    billable: false,
    rescheduledToId: replacementRef.id,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return replacementRef.id;
}

export async function deleteSession(tutorUid: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', tutorUid, 'sessions', sessionId));
}

export function sessionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update the session. Please try again.';
}
