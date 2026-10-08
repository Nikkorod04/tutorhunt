import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';

import { limitsFor } from '@/constants/plans';
import type { Plan, RateType, RecurringSeries, RecurringSeriesStatus, TopicCategory } from '@/types';
import { combineManilaDateAndTime, formatIsoDate } from '@/utils/date';
import { addCalendarMonths, generateRecurringDates, MAX_RECURRING_MONTHS, MAX_RECURRING_SESSIONS } from '@/utils/recurrence';
import { parseClockTime } from '@/utils/validation';
import { deriveSessionInput, type SessionInput } from './sessions.service';
import { getDb } from './firebase';

export const RECURRING_PAGE_SIZE = 10;

export interface RecurringSeriesInput {
  studentId: string;
  weekdays: number[];
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  subject: string;
  topicCategory: TopicCategory;
  rateType: RateType;
  appliedRate: number;
  skipDates: Date[];
}

function seriesCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'recurringSeries');
}

function sessionRef(tutorUid: string, sessionId: string) {
  return doc(getDb(), 'users', tutorUid, 'sessions', sessionId);
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function dateArray(value: unknown): Date[] {
  return Array.isArray(value) ? value.map((item) => toDate(item)).filter((item) => !Number.isNaN(item.getTime())) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapSeries(id: string, data: DocumentData): RecurringSeries {
  return {
    id,
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    weekdays: Array.isArray(data.weekdays) ? data.weekdays.filter((item): item is number => typeof item === 'number') : [],
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    startTime: typeof data.startTime === 'string' ? data.startTime : '4:00 PM',
    endTime: typeof data.endTime === 'string' ? data.endTime : '5:00 PM',
    subject: typeof data.subject === 'string' ? data.subject : '',
    topicCategory: (data.topicCategory ?? 'other') as TopicCategory,
    rateType: (data.rateType ?? 'hourly') as RateType,
    appliedRate: typeof data.appliedRate === 'number' ? data.appliedRate : 0,
    skipDates: dateArray(data.skipDates),
    generatedSessionIds: stringArray(data.generatedSessionIds),
    status: (data.status ?? 'active') as RecurringSeriesStatus,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function assertPro(plan: Plan | null | undefined) {
  if (!limitsFor(plan).recurringSessions) throw new Error('Recurring sessions are available on the Pro plan.');
}

function validateSeries(input: RecurringSeriesInput) {
  if (!input.studentId) throw new Error('Choose a student.');
  if (input.weekdays.length === 0) throw new Error('Choose at least one weekday.');
  if (input.endDate.getTime() < input.startDate.getTime()) throw new Error('End date must be after the start date.');
  if (input.endDate.getTime() > addCalendarMonths(input.startDate, MAX_RECURRING_MONTHS).getTime()) throw new Error('A recurring series can span up to 6 months.');
  const start = parseClockTime(input.startTime);
  const end = parseClockTime(input.endTime);
  if (!start || !end) throw new Error('Enter valid start and end times.');
  if (end.hours * 60 + end.minutes <= start.hours * 60 + start.minutes) throw new Error('End time must be after start time.');
  if (!input.subject.trim()) throw new Error('A subject is required.');
  if (!Number.isFinite(input.appliedRate) || input.appliedRate < 0) throw new Error('Rate cannot be negative.');
  const count = generateRecurringDates(input.startDate, input.endDate, input.weekdays, input.skipDates).length;
  if (count === 0) throw new Error('No sessions match those weekdays and dates.');
  if (count > MAX_RECURRING_SESSIONS) throw new Error('A series can contain up to 100 sessions.');
}

function sessionDataForDate(input: RecurringSeriesInput, date: Date, seriesId: string, id: string) {
  const start = parseClockTime(input.startTime)!;
  const end = parseClockTime(input.endTime)!;
  const sessionInput: SessionInput = {
    studentId: input.studentId,
    startsAt: combineManilaDateAndTime(date, start.hours, start.minutes),
    endsAt: combineManilaDateAndTime(date, end.hours, end.minutes),
    subject: input.subject.trim(),
    topicCategory: input.topicCategory,
    topicDetails: '',
    notes: '',
    rateType: input.rateType,
    appliedRate: input.appliedRate,
    status: 'scheduled',
    billable: false,
  };
  return {
    id,
    ...deriveSessionInput(sessionInput),
    rescheduledToId: null,
    recurringGroupId: seriesId,
    recurringSessionModified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function readSeries(tutorUid: string, seriesId: string): Promise<RecurringSeries> {
  const snapshot = await getDoc(doc(seriesCol(tutorUid), seriesId));
  if (!snapshot.exists()) throw new Error('Recurring series not found.');
  return mapSeries(snapshot.id, snapshot.data());
}

export async function getRecurringSeries(tutorUid: string, seriesId: string) {
  return readSeries(tutorUid, seriesId);
}

export interface RecurringSeriesPage {
  items: RecurringSeries[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listRecurringSeries(tutorUid: string, cursor: QueryDocumentSnapshot<DocumentData> | null = null): Promise<RecurringSeriesPage> {
  const constraints = [orderBy('updatedAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), fsLimit(RECURRING_PAGE_SIZE + 1)];
  const snapshot = await getDocs(query(seriesCol(tutorUid), ...constraints));
  const hasMore = snapshot.docs.length > RECURRING_PAGE_SIZE;
  const pageDocs = hasMore ? snapshot.docs.slice(0, RECURRING_PAGE_SIZE) : snapshot.docs;
  return { items: pageDocs.map((item) => mapSeries(item.id, item.data())), cursor: pageDocs.at(-1) ?? null, hasMore };
}

export async function createRecurringSeries(tutorUid: string, plan: Plan | null | undefined, input: RecurringSeriesInput): Promise<string> {
  assertPro(plan);
  validateSeries(input);
  const seriesRef = doc(seriesCol(tutorUid));
  const occurrenceDates = generateRecurringDates(input.startDate, input.endDate, input.weekdays, input.skipDates);
  const sessionRefs = occurrenceDates.map(() => doc(collection(getDb(), 'users', tutorUid, 'sessions')));
  const batch = writeBatch(getDb());
  sessionRefs.forEach((ref, index) => batch.set(ref, sessionDataForDate(input, occurrenceDates[index], seriesRef.id, ref.id)));
  batch.set(seriesRef, { id: seriesRef.id, ...input, generatedSessionIds: sessionRefs.map((ref) => ref.id), status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await batch.commit();
  return seriesRef.id;
}

export async function updateRecurringSeries(tutorUid: string, plan: Plan | null | undefined, seriesId: string, input: RecurringSeriesInput): Promise<void> {
  assertPro(plan);
  validateSeries(input);
  const current = await readSeries(tutorUid, seriesId);
  const batch = writeBatch(getDb());
  const now = Date.now();
  for (const id of current.generatedSessionIds) {
    const ref = sessionRef(tutorUid, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) continue;
    const data = snapshot.data();
    if (toDate(data.startsAt).getTime() <= now || data.billable === true || data.status === 'completed' || data.recurringSessionModified === true) continue;
    batch.set(ref, sessionDataForDate(input, toDate(data.startsAt), seriesId, id), { merge: true });
  }
  batch.update(doc(seriesCol(tutorUid), seriesId), { ...input, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function extendRecurringSeries(tutorUid: string, plan: Plan | null | undefined, seriesId: string, endDate: Date, skipDates: Date[]): Promise<void> {
  assertPro(plan);
  const current = await readSeries(tutorUid, seriesId);
  if (current.status !== 'active') throw new Error('Only active series can be extended.');
  if (endDate.getTime() <= current.endDate.getTime()) throw new Error('Choose a later end date.');
  const input: RecurringSeriesInput = { ...current, endDate, skipDates };
  validateSeries(input);
  const existingDates = new Set<string>();
  for (const id of current.generatedSessionIds) {
    const snapshot = await getDoc(sessionRef(tutorUid, id));
    if (snapshot.exists()) existingDates.add(formatIsoDate(toDate(snapshot.data().startsAt)));
  }
  const newDates = generateRecurringDates(current.startDate, endDate, current.weekdays, skipDates).filter((date) => !existingDates.has(formatIsoDate(date)));
  if (current.generatedSessionIds.length + newDates.length > MAX_RECURRING_SESSIONS) throw new Error('A series can contain up to 100 sessions.');
  const batch = writeBatch(getDb());
  const newIds = [...current.generatedSessionIds];
  for (const date of newDates) {
    const ref = doc(collection(getDb(), 'users', tutorUid, 'sessions'));
    newIds.push(ref.id);
    batch.set(ref, sessionDataForDate(input, date, seriesId, ref.id));
  }
  batch.update(doc(seriesCol(tutorUid), seriesId), { endDate, skipDates, generatedSessionIds: newIds, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function cancelRecurringSeries(tutorUid: string, plan: Plan | null | undefined, seriesId: string): Promise<void> {
  assertPro(plan);
  const current = await readSeries(tutorUid, seriesId);
  const batch = writeBatch(getDb());
  const now = Date.now();
  for (const id of current.generatedSessionIds) {
    const ref = sessionRef(tutorUid, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) continue;
    const data = snapshot.data();
    if (toDate(data.startsAt).getTime() > now && data.billable !== true && data.status !== 'completed') batch.delete(ref);
  }
  batch.update(doc(seriesCol(tutorUid), seriesId), { status: 'cancelled', updatedAt: serverTimestamp() });
  await batch.commit();
}

export function recurringErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Could not update the recurring series. Please try again.';
}
