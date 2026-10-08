/** Payment CRUD and pagination. Blueprint sections 16 and Phase 5. */

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
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { Payment, PaymentMethod } from '@/types';
import { roundCurrency } from '@/utils/pricing';
import { getDb } from './firebase';

export const PAYMENT_PAGE_SIZE = 10;

export interface PaymentInput {
  studentId: string;
  amount: number;
  datePaid: Date;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

function paymentsCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'payments');
}

function toDate(value: unknown, fallback: Date = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    // Preserve the Timestamp receiver because Firebase's toDate() calls
    // this.toMillis() internally.
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function mapPayment(id: string, data: DocumentData): Payment {
  return {
    id,
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    datePaid: toDate(data.datePaid),
    method: (data.method ?? 'other') as PaymentMethod,
    reference: typeof data.reference === 'string' ? data.reference : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: toDate(data.createdAt),
  };
}

function persistedInput(input: PaymentInput) {
  return {
    ...input,
    amount: roundCurrency(input.amount),
  };
}

export interface PaymentPage {
  items: Payment[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ListPaymentsOptions {
  studentId?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

export async function listPayments(
  tutorUid: string,
  { studentId, pageSize = PAYMENT_PAGE_SIZE, cursor = null }: ListPaymentsOptions = {},
): Promise<PaymentPage> {
  const constraints: QueryConstraint[] = [];
  if (studentId) constraints.push(where('studentId', '==', studentId));
  constraints.push(orderBy('datePaid', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(fsLimit(pageSize + 1));

  const snapshot = await getDocs(query(paymentsCol(tutorUid), ...constraints));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    items: pageDocs.map((item) => mapPayment(item.id, item.data())),
    cursor: pageDocs.at(-1) ?? null,
    hasMore,
  };
}

/** Full ledger read used by the earnings screen and dashboard. */
export async function listAllPayments(tutorUid: string): Promise<Payment[]> {
  const snapshot = await getDocs(query(paymentsCol(tutorUid), orderBy('datePaid', 'desc')));
  return snapshot.docs.map((item) => mapPayment(item.id, item.data()));
}

export async function getPayment(tutorUid: string, paymentId: string): Promise<Payment | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', tutorUid, 'payments', paymentId));
  return snapshot.exists() ? mapPayment(snapshot.id, snapshot.data()) : null;
}

export async function createPayment(tutorUid: string, input: PaymentInput): Promise<string> {
  if (!input.studentId.trim()) throw new Error('Choose a student.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const paymentRef = doc(paymentsCol(tutorUid));
  await setDoc(paymentRef, {
    id: paymentRef.id,
    ...persistedInput(input),
    createdAt: serverTimestamp(),
  });
  return paymentRef.id;
}

export async function updatePayment(
  tutorUid: string,
  paymentId: string,
  input: PaymentInput,
): Promise<void> {
  if (!input.studentId.trim()) throw new Error('Choose a student.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  await updateDoc(doc(getDb(), 'users', tutorUid, 'payments', paymentId), {
    ...persistedInput(input),
  });
}

export async function deletePayment(tutorUid: string, paymentId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', tutorUid, 'payments', paymentId));
}

export function paymentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update the payment. Please try again.';
}
