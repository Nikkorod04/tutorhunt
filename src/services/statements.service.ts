/** Statement candidates, metadata and transactional generation. Phase 6. */

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { PLAN_LIMITS } from '@/constants/plans';
import { isPro, quotaState, type QuotaState } from '@/services/entitlements.service';
import type { Entitlement, Expense, Session, Statement } from '@/types';
import {
  expenseTotal,
  isChargeable,
  roundCurrency,
  sumPayments,
  sumSessionCharges,
} from '@/utils/pricing';
import { manilaDayRange, manilaParts } from '@/utils/date';
import { listAllExpenses } from './expenses.service';
import { listAllPayments } from './payments.service';
import { listAllSessions } from './sessions.service';
import { getDb } from './firebase';

export const STATEMENT_PAGE_SIZE = 10;

function statementsCol(tutorUid: string) {
  return collection(getDb(), 'users', tutorUid, 'statements');
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

function mapStatement(id: string, data: DocumentData): Statement {
  return {
    id,
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    statementNumber: typeof data.statementNumber === 'string' ? data.statementNumber : '',
    status: data.status === 'voided' ? 'voided' : 'active',
    reissueOfStatementId: typeof data.reissueOfStatementId === 'string' ? data.reissueOfStatementId : null,
    replacementStatementId: typeof data.replacementStatementId === 'string' ? data.replacementStatementId : null,
    voidedAt: data.voidedAt === null || data.voidedAt === undefined ? null : toDate(data.voidedAt),
    periodStart: toDate(data.periodStart),
    periodEnd: toDate(data.periodEnd),
    sessionIds: Array.isArray(data.sessionIds) ? data.sessionIds.filter((item): item is string => typeof item === 'string') : [],
    expenseIds: Array.isArray(data.expenseIds) ? data.expenseIds.filter((item): item is string => typeof item === 'string') : [],
    sessionSubtotal: typeof data.sessionSubtotal === 'number' ? data.sessionSubtotal : 0,
    expenseSubtotal: typeof data.expenseSubtotal === 'number' ? data.expenseSubtotal : 0,
    totalDue: typeof data.totalDue === 'number' ? data.totalDue : 0,
    amountPaidAtIssue: typeof data.amountPaidAtIssue === 'number' ? data.amountPaidAtIssue : 0,
    notes: typeof data.notes === 'string' ? data.notes : '',
    generatedAt: toDate(data.generatedAt),
  };
}

function expenseAnchor(expense: Expense): Date {
  const validDates = expense.expenseDates.filter((date) => !Number.isNaN(date.getTime()));
  return [...validDates].sort((left, right) => left.getTime() - right.getTime())[0]
    ?? expense.createdAt;
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

export interface StatementCandidates {
  sessions: Session[];
  expenses: Expense[];
  amountPaidAtIssue: number;
}

/**
 * Loads the selectable billable sessions and not-yet-stated reimbursable
 * expenses for one student and period.
 */
export async function getStatementCandidates(
  tutorUid: string,
  studentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<StatementCandidates> {
  const [allSessions, allExpenses, allPayments] = await Promise.all([
    listAllSessions(tutorUid),
    listAllExpenses(tutorUid),
    listAllPayments(tutorUid),
  ]);

  const startRange = manilaDayRange(periodStart).start;
  const endRange = manilaDayRange(periodEnd).end;

  return {
    sessions: allSessions.filter(
      (session) => session.studentId === studentId
        && isInRange(session.startsAt, startRange, endRange)
        && isChargeable(session),
    ),
    expenses: allExpenses.filter(
      (expense) => expense.studentId === studentId
        && expense.reimbursable
        && expense.reimbursementStatus === 'not_requested'
        && isInRange(expenseAnchor(expense), startRange, endRange),
    ),
    amountPaidAtIssue: sumPayments(allPayments.filter((payment) => payment.studentId === studentId)),
  };
}

/**
 * Loads normal candidates plus the items belonging to an active statement so
 * a reissue can be edited without unlocking the original first.
 */
export async function getStatementReissueCandidates(
  tutorUid: string,
  originalStatementId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<StatementCandidates> {
  const original = await getStatement(tutorUid, originalStatementId);
  if (!original) throw new Error('The original statement could not be found.');
  if (original.status === 'voided' || original.replacementStatementId) {
    throw new Error('This statement has already been voided or reissued.');
  }

  const [allSessions, allExpenses, allPayments] = await Promise.all([
    listAllSessions(tutorUid),
    listAllExpenses(tutorUid),
    listAllPayments(tutorUid),
  ]);
  const originalSessionIds = new Set(original.sessionIds);
  const originalExpenseIds = new Set(original.expenseIds);
  const startRange = manilaDayRange(periodStart).start;
  const endRange = manilaDayRange(periodEnd).end;

  return {
    sessions: allSessions.filter(
      (session) => session.studentId === original.studentId
        && (originalSessionIds.has(session.id)
          || (isInRange(session.startsAt, startRange, endRange) && isChargeable(session))),
    ),
    expenses: allExpenses.filter(
      (expense) => expense.studentId === original.studentId
        && expense.reimbursable
        && (originalExpenseIds.has(expense.id)
          || (expense.reimbursementStatus === 'not_requested'
            && isInRange(expenseAnchor(expense), startRange, endRange))),
    ),
    amountPaidAtIssue: sumPayments(allPayments.filter((payment) => payment.studentId === original.studentId)),
  };
}

export interface StatementTotals {
  sessionSubtotal: number;
  expenseSubtotal: number;
  totalDue: number;
  remainingBalance: number;
}

export function calculateStatementTotals(
  sessions: readonly Session[],
  expenses: readonly Expense[],
  amountPaidAtIssue: number,
): StatementTotals {
  const sessionSubtotal = sumSessionCharges(sessions);
  const expenseSubtotal = roundCurrency(expenses.reduce((total, expense) => total + expenseTotal(expense), 0));
  const totalDue = roundCurrency(sessionSubtotal + expenseSubtotal);
  return {
    sessionSubtotal,
    expenseSubtotal,
    totalDue,
    remainingBalance: roundCurrency(totalDue - amountPaidAtIssue),
  };
}

export function statementQuotaState(
  entitlement: Entitlement,
  now: Date = new Date(),
): QuotaState {
  const limit = isPro(entitlement, now) ? Number.POSITIVE_INFINITY : PLAN_LIMITS.free.monthlyPdfs;
  return quotaState(entitlement, limit, now);
}

export interface GenerateStatementInput {
  studentId: string;
  periodStart: Date;
  periodEnd: Date;
  sessionIds: string[];
  expenseIds: string[];
  sessionSubtotal: number;
  expenseSubtotal: number;
  totalDue: number;
  amountPaidAtIssue: number;
  notes: string;
}

export class StatementQuotaError extends Error {
  constructor() {
    super('You have reached the free plan statement limit for this month.');
    this.name = 'StatementQuotaError';
  }
}

export async function nextStatementNumber(
  tutorUid: string,
  generatedAt: Date = new Date(),
): Promise<string> {
  const snapshot = await getCountFromServer(query(statementsCol(tutorUid)));
  const year = manilaParts(generatedAt).year;
  return `TH-${year}-${String(snapshot.data().count + 1).padStart(4, '0')}`;
}

export interface GeneratedStatement {
  statement: Statement;
  entitlement: Entitlement;
}

/**
 * Commits metadata, expense inclusion and quota consumption in one
 * transaction. If any validation or quota check fails, no statement is
 * created and no expense is marked.
 */
export async function generateStatement(
  tutorUid: string,
  input: GenerateStatementInput,
  entitlement: Entitlement,
  statementNumber: string,
  generatedAt: Date = new Date(),
): Promise<GeneratedStatement> {
  const statementRef = doc(statementsCol(tutorUid));
  const entitlementRef = doc(getDb(), 'entitlements', tutorUid);
  const expenseRefs = input.expenseIds.map((id) => doc(getDb(), 'users', tutorUid, 'expenses', id));
  const month = `${manilaParts(generatedAt).year}-${String(manilaParts(generatedAt).month + 1).padStart(2, '0')}`;

  await runTransaction(getDb(), async (transaction) => {
    const entitlementSnapshot = await transaction.get(entitlementRef);
    if (!entitlementSnapshot.exists()) throw new Error('Entitlement not found.');

    const entitlementData = entitlementSnapshot.data();
    const storedMonth = typeof entitlementData.usageMonth === 'string' ? entitlementData.usageMonth : month;
    const storedUsage = typeof entitlementData.pdfStatementsThisMonth === 'number'
      ? entitlementData.pdfStatementsThisMonth
      : 0;
    const proUntil = entitlementData.proUntil === null || entitlementData.proUntil === undefined
      ? null
      : toDate(entitlementData.proUntil);
    const activePro = entitlementData.plan === 'pro'
      && (proUntil === null || proUntil.getTime() > generatedAt.getTime());
    const limit = activePro ? Number.POSITIVE_INFINITY : PLAN_LIMITS.free.monthlyPdfs;
    const used = storedMonth === month ? storedUsage : 0;
    if (Number.isFinite(limit) && used >= limit) throw new StatementQuotaError();

    const expenseSnapshots = [];
    for (const expenseRef of expenseRefs) {
      expenseSnapshots.push(await transaction.get(expenseRef));
    }

    for (const expenseSnapshot of expenseSnapshots) {
      if (!expenseSnapshot.exists()) throw new Error('One of the selected expenses no longer exists.');
      const expenseData = expenseSnapshot.data();
      if (expenseData.studentId !== input.studentId || expenseData.reimbursable !== true) {
        throw new Error('One of the selected expenses is not valid for this statement.');
      }
      if ((expenseData.reimbursementStatus ?? 'not_requested') !== 'not_requested') {
        throw new Error('One of the selected expenses is already on a statement.');
      }
    }

    transaction.set(statementRef, {
      id: statementRef.id,
      studentId: input.studentId,
      statementNumber,
      status: 'active',
      reissueOfStatementId: null,
      replacementStatementId: null,
      voidedAt: null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      sessionIds: input.sessionIds,
      expenseIds: input.expenseIds,
      sessionSubtotal: roundCurrency(input.sessionSubtotal),
      expenseSubtotal: roundCurrency(input.expenseSubtotal),
      totalDue: roundCurrency(input.totalDue),
      amountPaidAtIssue: roundCurrency(input.amountPaidAtIssue),
      notes: input.notes.trim(),
      generatedAt,
    });

    for (const expenseRef of expenseRefs) {
      transaction.update(expenseRef, {
        reimbursementStatus: 'included_in_statement',
        statementId: statementRef.id,
      });
    }

    transaction.set(entitlementRef, {
      usageMonth: month,
      pdfStatementsThisMonth: used + 1,
      updatedAt: generatedAt,
    }, { merge: true });
  });

  const nextUsageMonth = month;
  const nextUsage = entitlement.usageMonth === nextUsageMonth
    ? entitlement.pdfStatementsThisMonth + 1
    : 1;
  return {
    statement: {
      id: statementRef.id,
      studentId: input.studentId,
      statementNumber,
      status: 'active',
      reissueOfStatementId: null,
      replacementStatementId: null,
      voidedAt: null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      sessionIds: input.sessionIds,
      expenseIds: input.expenseIds,
      sessionSubtotal: roundCurrency(input.sessionSubtotal),
      expenseSubtotal: roundCurrency(input.expenseSubtotal),
      totalDue: roundCurrency(input.totalDue),
      amountPaidAtIssue: roundCurrency(input.amountPaidAtIssue),
      notes: input.notes.trim(),
      generatedAt,
    },
    entitlement: {
      ...entitlement,
      usageMonth: nextUsageMonth,
      pdfStatementsThisMonth: nextUsage,
      updatedAt: generatedAt,
    },
  };
}

/**
 * Replaces an active statement without consuming another PDF quota unit.
 * The original and replacement are changed together so an interrupted or
 * failed reissue cannot leave expenses detached from either statement.
 */
export async function reissueStatement(
  tutorUid: string,
  originalStatementId: string,
  input: GenerateStatementInput,
  statementNumber: string,
  generatedAt: Date = new Date(),
): Promise<Statement> {
  const originalRef = doc(statementsCol(tutorUid), originalStatementId);
  const replacementRef = doc(statementsCol(tutorUid));
  const expenseIds = [...new Set(input.expenseIds)];

  await runTransaction(getDb(), async (transaction) => {
    const originalSnapshot = await transaction.get(originalRef);
    if (!originalSnapshot.exists()) throw new Error('The original statement could not be found.');
    const originalData = originalSnapshot.data();
    if (originalData.status === 'voided' || typeof originalData.replacementStatementId === 'string') {
      throw new Error('This statement has already been voided or reissued.');
    }
    if (originalData.studentId !== input.studentId) {
      throw new Error('The replacement must use the original statement student.');
    }

    const originalExpenseIds = Array.isArray(originalData.expenseIds)
      ? originalData.expenseIds.filter((item): item is string => typeof item === 'string')
      : [];
    const allExpenseIds = [...new Set([...originalExpenseIds, ...expenseIds])];
    const allExpenseRefs = allExpenseIds.map((id) => doc(getDb(), 'users', tutorUid, 'expenses', id));
    const expenseSnapshots = await Promise.all(allExpenseRefs.map((ref) => transaction.get(ref)));
    const snapshotById = new Map(allExpenseIds.map((id, index) => [id, expenseSnapshots[index]]));
    const originalExpenseIdSet = new Set(originalExpenseIds);
    const selectedExpenseIdSet = new Set(expenseIds);

    for (const expenseId of expenseIds) {
      const snapshot = snapshotById.get(expenseId);
      if (!snapshot?.exists()) throw new Error('One of the selected expenses no longer exists.');
      const data = snapshot.data();
      const belongsToOriginal = originalExpenseIdSet.has(expenseId)
        && data.statementId === originalStatementId;
      const available = data.reimbursementStatus === 'not_requested' || belongsToOriginal;
      if (data.studentId !== input.studentId || data.reimbursable !== true || !available) {
        throw new Error('One of the selected expenses is not available for this replacement.');
      }
    }

    for (const expenseId of originalExpenseIds) {
      if (selectedExpenseIdSet.has(expenseId)) continue;
      const snapshot = snapshotById.get(expenseId);
      if (!snapshot?.exists()) continue;
      const data = snapshot.data();
      if (data.reimbursementStatus === 'paid' && data.statementId === originalStatementId) {
        throw new Error('An expense already marked as reimbursed cannot be removed from the replacement.');
      }
      if (data.reimbursementStatus !== 'included_in_statement' || data.statementId !== originalStatementId) {
        throw new Error('One of the original expenses changed and must be reviewed before reissuing.');
      }
    }

    transaction.set(replacementRef, {
      id: replacementRef.id,
      studentId: input.studentId,
      statementNumber,
      status: 'active',
      reissueOfStatementId: originalStatementId,
      replacementStatementId: null,
      voidedAt: null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      sessionIds: input.sessionIds,
      expenseIds,
      sessionSubtotal: roundCurrency(input.sessionSubtotal),
      expenseSubtotal: roundCurrency(input.expenseSubtotal),
      totalDue: roundCurrency(input.totalDue),
      amountPaidAtIssue: roundCurrency(input.amountPaidAtIssue),
      notes: input.notes.trim(),
      generatedAt,
    });

    transaction.update(originalRef, {
      status: 'voided',
      replacementStatementId: replacementRef.id,
      voidedAt: generatedAt,
    });

    for (const expenseId of originalExpenseIds) {
      if (selectedExpenseIdSet.has(expenseId)) continue;
      transaction.update(doc(getDb(), 'users', tutorUid, 'expenses', expenseId), {
        reimbursementStatus: 'not_requested',
        statementId: null,
        updatedAt: generatedAt,
      });
    }

    for (const expenseId of expenseIds) {
      const snapshot = snapshotById.get(expenseId);
      const data = snapshot?.data();
      const keepPaid = data?.reimbursementStatus === 'paid';
      transaction.update(doc(getDb(), 'users', tutorUid, 'expenses', expenseId), {
        reimbursementStatus: keepPaid ? 'paid' : 'included_in_statement',
        statementId: replacementRef.id,
        updatedAt: generatedAt,
      });
    }
  });

  return {
    id: replacementRef.id,
    studentId: input.studentId,
    statementNumber,
    status: 'active',
    reissueOfStatementId: originalStatementId,
    replacementStatementId: null,
    voidedAt: null,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    sessionIds: input.sessionIds,
    expenseIds,
    sessionSubtotal: roundCurrency(input.sessionSubtotal),
    expenseSubtotal: roundCurrency(input.expenseSubtotal),
    totalDue: roundCurrency(input.totalDue),
    amountPaidAtIssue: roundCurrency(input.amountPaidAtIssue),
    notes: input.notes.trim(),
    generatedAt,
  };
}

export interface StatementPage {
  items: Statement[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listStatements(
  tutorUid: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize = STATEMENT_PAGE_SIZE,
): Promise<StatementPage> {
  const constraints: QueryConstraint[] = [orderBy('generatedAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(fsLimit(pageSize + 1));
  const snapshot = await getDocs(query(statementsCol(tutorUid), ...constraints));
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    items: pageDocs.map((item) => mapStatement(item.id, item.data())),
    cursor: pageDocs.at(-1) ?? null,
    hasMore,
  };
}

export async function getStatement(tutorUid: string, statementId: string): Promise<Statement | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', tutorUid, 'statements', statementId));
  return snapshot.exists() ? mapStatement(snapshot.id, snapshot.data()) : null;
}

export function statementErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not generate the statement. Please try again.';
}
