/**
 * Pricing and ledger maths. Blueprint sections 13 and 17.
 *
 * This module is deliberately pure and self-contained:
 * - no React Native imports, so it is testable outside the app
 * - only `import type` statements, so a type-stripping runtime can execute it
 *   directly with no bundler
 *
 * Every screen must route money maths through here. No screen computes a fee,
 * a total or a balance on its own (blueprint agent rule 23).
 */

import type { Expense, Payment, Session, SessionStatus } from '@/types';

/** Money is stored as a float; round at every boundary to stop drift. */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Duration and fees
// ---------------------------------------------------------------------------

/** Whole minutes between two instants, floored, never negative. */
export function computeDurationMinutes(startsAt: Date, endsAt: Date): number {
  const ms = endsAt.getTime() - startsAt.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 60_000);
}

export interface FeeInput {
  rateType: Session['rateType'];
  appliedRate: number;
  durationMinutes: number;
}

/**
 * Hourly sessions bill pro rata; per-session sessions bill a flat rate.
 * A negative rate is treated as zero rather than producing a negative fee.
 */
export function computeSessionFee({ rateType, appliedRate, durationMinutes }: FeeInput): number {
  const rate = appliedRate > 0 ? appliedRate : 0;
  if (rateType === 'per_session') return roundCurrency(rate);
  if (durationMinutes <= 0) return 0;
  return roundCurrency((durationMinutes / 60) * rate);
}

// ---------------------------------------------------------------------------
// Billable status
// ---------------------------------------------------------------------------

/** billable may only be true on these statuses (blueprint section 13). */
export const BILLABLE_ELIGIBLE_STATUSES: readonly SessionStatus[] = [
  'completed',
  'student_absent',
  'cancelled_by_parent',
];

export function defaultBillableFor(status: SessionStatus): boolean {
  return status === 'completed';
}

export function canOverrideBillable(status: SessionStatus): boolean {
  return BILLABLE_ELIGIBLE_STATUSES.includes(status);
}

export type ChargeableSession = Pick<Session, 'status' | 'billable'>;

/**
 * Blueprint section 13: a session produces a charge when it is completed, or
 * when the tutor has explicitly marked it billable (a charged no-show or late
 * cancellation).
 */
export function isChargeable(session: ChargeableSession): boolean {
  return session.status === 'completed' || session.billable === true;
}

export type SessionChargeInput = ChargeableSession & Pick<Session, 'sessionFee'>;

export function sessionCharge(session: SessionChargeInput): number {
  return isChargeable(session) ? roundCurrency(session.sessionFee) : 0;
}

export function sumSessionCharges(sessions: readonly SessionChargeInput[]): number {
  return roundCurrency(sessions.reduce((total, s) => total + sessionCharge(s), 0));
}

/** Accrual figure: what was earned, whether or not cash arrived. */
export const grossSessionEarnings = sumSessionCharges;

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export type ExpenseAmountInput = Pick<Expense, 'amountPerOccurrence' | 'expenseDates'> &
  Partial<Pick<Expense, 'reimbursable' | 'reimbursementStatus'>>;

/**
 * amountPerOccurrence is the cost of ONE occurrence, so the total for an
 * expense with three dates is amount * 3 (blueprint section 15).
 */
export function expenseTotal(expense: ExpenseAmountInput): number {
  const occurrences = expense.expenseDates?.length ?? 0;
  if (occurrences <= 0) return 0;
  const per = expense.amountPerOccurrence > 0 ? expense.amountPerOccurrence : 0;
  return roundCurrency(per * occurrences);
}

export function sumReimbursableExpenses(expenses: readonly ExpenseAmountInput[]): number {
  return roundCurrency(
    expenses.reduce((total, e) => total + (e.reimbursable ? expenseTotal(e) : 0), 0),
  );
}

/** Reimbursable expenses that have actually been marked paid. */
export function sumReimbursedExpenses(expenses: readonly ExpenseAmountInput[]): number {
  return roundCurrency(
    expenses.reduce(
      (total, expense) => total + (expense.reimbursable && expense.reimbursementStatus === 'paid'
        ? expenseTotal(expense)
        : 0),
      0,
    ),
  );
}

export function sumNonReimbursableExpenses(expenses: readonly ExpenseAmountInput[]): number {
  return roundCurrency(
    expenses.reduce((total, e) => total + (e.reimbursable ? 0 : expenseTotal(e)), 0),
  );
}

/** Tutor costs are the non-reimbursable expenses. */
export const tutorCosts = sumNonReimbursableExpenses;

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentAmountInput = Pick<Payment, 'amount'>;

export function sumPayments(payments: readonly PaymentAmountInput[]): number {
  return roundCurrency(payments.reduce((total, p) => total + (p.amount > 0 ? p.amount : 0), 0));
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

export interface LedgerInput {
  sessions: readonly SessionChargeInput[];
  /** Only reimbursable expenses belong in a parent-facing balance. */
  reimbursableExpenses: readonly ExpenseAmountInput[];
  payments: readonly PaymentAmountInput[];
}

/** What the parent owes before payments: session charges plus reimbursables. */
export function computeCharges({
  sessions,
  reimbursableExpenses,
}: Pick<LedgerInput, 'sessions' | 'reimbursableExpenses'>): number {
  return roundCurrency(
    sumSessionCharges(sessions) + sumReimbursableExpenses(reimbursableExpenses),
  );
}

/**
 * Outstanding is computed PER STUDENT (blueprint section 16). The dashboard
 * shows the sum of the per-student values, never a single global figure.
 * May be negative when a parent has overpaid; callers decide how to present it.
 */
export function computeOutstanding({
  sessions,
  reimbursableExpenses,
  payments,
}: LedgerInput): number {
  return roundCurrency(
    computeCharges({ sessions, reimbursableExpenses }) - sumPayments(payments),
  );
}

/** Cash figure: money actually received minus money actually spent. */
export function netTutorIncome({
  payments,
  expenses,
}: {
  payments: readonly PaymentAmountInput[];
  expenses: readonly ExpenseAmountInput[];
}): number {
  return roundCurrency(sumPayments(payments) - tutorCosts(expenses));
}

// ---------------------------------------------------------------------------
// Dashboard roll-up
// ---------------------------------------------------------------------------

export interface MonthlySummary {
  /** Accrual: session fees earned. */
  grossSessionEarnings: number;
  reimbursableExpenses: number;
  /** Accrual: everything chargeable to parents. */
  charges: number;
  outstanding: number;
  /** Cash: money received. */
  paymentsReceived: number;
  tutorCosts: number;
  /** Cash: paymentsReceived - tutorCosts. Not comparable to gross. */
  netIncome: number;
}

export function monthlySummary({
  sessions,
  reimbursableExpenses,
  expenses,
  payments,
}: {
  sessions: readonly SessionChargeInput[];
  reimbursableExpenses: readonly ExpenseAmountInput[];
  /** All expenses, for the tutor-cost figure. */
  expenses: readonly ExpenseAmountInput[];
  payments: readonly PaymentAmountInput[];
}): MonthlySummary {
  return {
    grossSessionEarnings: sumSessionCharges(sessions),
    reimbursableExpenses: sumReimbursableExpenses(reimbursableExpenses),
    charges: computeCharges({ sessions, reimbursableExpenses }),
    outstanding: computeOutstanding({ sessions, reimbursableExpenses, payments }),
    paymentsReceived: sumPayments(payments),
    tutorCosts: tutorCosts(expenses),
    netIncome: netTutorIncome({ payments, expenses }),
  };
}
