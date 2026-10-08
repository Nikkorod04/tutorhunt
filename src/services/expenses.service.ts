/** Expense CRUD and pagination. Blueprint section 15. */

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

import type {
  Expense,
  ExpenseCategory,
  ReimbursementStatus,
} from '@/types';
import { expenseTotal, roundCurrency } from '@/utils/pricing';
import { getDb } from './firebase';

export const EXPENSE_PAGE_SIZE = 10;
const REIMBURSEMENT_ORDER: ReimbursementStatus[] = [
  'not_requested',
  'included_in_statement',
  'paid',
];

export interface ExpenseInput {
  studentId: string | null;
  title: string;
  category: ExpenseCategory;
  amountPerOccurrence: number;
  expenseDates: Date[];
  notes: string;
  reimbursable: boolean;
  receiptUrl: string | null;
}

function expensesCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'expenses');
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

function toDateArray(value: unknown): Date[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toDate(item, new Date(Number.NaN))).filter((date) => !Number.isNaN(date.getTime()));
}

function mapExpense(id: string, data: DocumentData): Expense {
  return {
    id,
    studentId: typeof data.studentId === 'string' ? data.studentId : null,
    title: typeof data.title === 'string' ? data.title : '',
    category: (data.category ?? 'other') as ExpenseCategory,
    amountPerOccurrence: typeof data.amountPerOccurrence === 'number' ? data.amountPerOccurrence : 0,
    expenseDates: toDateArray(data.expenseDates),
    notes: typeof data.notes === 'string' ? data.notes : '',
    receiptUrl: typeof data.receiptUrl === 'string' ? data.receiptUrl : null,
    reimbursable: data.reimbursable === true,
    reimbursementStatus: (data.reimbursementStatus ?? 'not_requested') as ReimbursementStatus,
    statementId: typeof data.statementId === 'string' ? data.statementId : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function persistedInput(input: ExpenseInput, receiptUrl: string | null) {
  return {
    ...input,
    amountPerOccurrence: roundCurrency(input.amountPerOccurrence),
    receiptUrl,
  };
}

export interface ExpensePage {
  items: Expense[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface ListExpensesOptions {
  studentId?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

export async function listExpenses(
  tutorUid: string,
  { studentId, pageSize = EXPENSE_PAGE_SIZE, cursor = null }: ListExpensesOptions = {},
): Promise<ExpensePage> {
  const constraints: QueryConstraint[] = [];
  if (studentId) constraints.push(where('studentId', '==', studentId));
  constraints.push(orderBy('createdAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(fsLimit(pageSize + 1));

  const snapshot = await getDocs(query(expensesCol(tutorUid), ...constraints));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    items: pageDocs.map((item) => mapExpense(item.id, item.data())),
    cursor: pageDocs.at(-1) ?? null,
    hasMore,
  };
}

/** Full expense read used by the earnings ledger. */
export async function listAllExpenses(tutorUid: string): Promise<Expense[]> {
  const snapshot = await getDocs(query(expensesCol(tutorUid), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => mapExpense(item.id, item.data()));
}

export async function getExpense(tutorUid: string, expenseId: string): Promise<Expense | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', tutorUid, 'expenses', expenseId));
  return snapshot.exists() ? mapExpense(snapshot.id, snapshot.data()) : null;
}

export async function createExpense(tutorUid: string, input: ExpenseInput): Promise<string> {
  const expenseRef = doc(expensesCol(tutorUid));

  await setDoc(expenseRef, {
    id: expenseRef.id,
    ...persistedInput(input, null),
    reimbursementStatus: 'not_requested',
    statementId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return expenseRef.id;
}

export async function updateExpense(
  tutorUid: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<string | null> {
  const expenseRef = doc(getDb(), 'users', tutorUid, 'expenses', expenseId);
  const current = await getDoc(expenseRef);
  if (!current.exists()) throw new Error('Expense not found.');

  const previousUrl = typeof current.data().receiptUrl === 'string' ? current.data().receiptUrl : null;

  await updateDoc(expenseRef, {
    ...persistedInput(input, previousUrl),
    reimbursementStatus: input.reimbursable
      ? current.data().reimbursementStatus ?? 'not_requested'
      : 'not_requested',
    statementId: input.reimbursable ? current.data().statementId ?? null : null,
    updatedAt: serverTimestamp(),
  });
  return previousUrl;
}

export async function deleteExpense(tutorUid: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', tutorUid, 'expenses', expenseId));
}

export async function updateReimbursementStatus(
  tutorUid: string,
  expenseId: string,
  status: ReimbursementStatus,
  statementId: string | null = null,
): Promise<void> {
  const expenseRef = doc(getDb(), 'users', tutorUid, 'expenses', expenseId);
  const current = await getDoc(expenseRef);
  if (!current.exists()) throw new Error('Expense not found.');

  const currentStatus = (current.data().reimbursementStatus ?? 'not_requested') as ReimbursementStatus;
  if (REIMBURSEMENT_ORDER.indexOf(status) < REIMBURSEMENT_ORDER.indexOf(currentStatus)) {
    throw new Error('Reimbursement status cannot move backwards.');
  }
  await updateDoc(expenseRef, {
    reimbursementStatus: status,
    statementId: status === 'included_in_statement' ? statementId : current.data().statementId ?? null,
    updatedAt: serverTimestamp(),
  });
}

export function expenseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update the expense. Please try again.';
}

export function expenseTotalForDisplay(expense: Pick<Expense, 'amountPerOccurrence' | 'expenseDates'>): number {
  return expenseTotal(expense);
}
