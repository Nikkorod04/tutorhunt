/**
 * Unit tests for the money maths. Blueprint sections 13 and 17.
 *
 * Run with:  npm test
 *
 * The module under test is pure and uses only `import type`, so Node can
 * execute the TypeScript directly by stripping types. The explicit `.ts`
 * extension on the import is required by that runtime.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BILLABLE_ELIGIBLE_STATUSES,
  canOverrideBillable,
  computeCharges,
  computeDurationMinutes,
  computeOutstanding,
  computeSessionFee,
  defaultBillableFor,
  expenseTotal,
  grossSessionEarnings,
  isChargeable,
  monthlySummary,
  netTutorIncome,
  roundCurrency,
  sessionCharge,
  sumNonReimbursableExpenses,
  sumReimbursedExpenses,
  sumPayments,
  sumReimbursableExpenses,
  sumSessionCharges,
  tutorCosts,
} from '../src/utils/pricing.ts';

// --- helpers ---------------------------------------------------------------

const session = (
  over: Partial<{ status: string; billable: boolean; sessionFee: number }> = {},
) => ({
  status: (over.status ?? 'completed') as never,
  billable: over.billable ?? false,
  sessionFee: over.sessionFee ?? 0,
});

const expense = (over: {
  amountPerOccurrence: number;
  occurrences: number;
  reimbursable?: boolean;
}) => ({
  amountPerOccurrence: over.amountPerOccurrence,
  expenseDates: Array.from({ length: over.occurrences }, (_, i) => new Date(2026, 9, i + 1)),
  reimbursable: over.reimbursable ?? false,
});

// --- duration --------------------------------------------------------------

test('duration is the whole-minute difference between start and end', () => {
  const start = new Date('2026-10-07T16:00:00+08:00');
  const end = new Date('2026-10-07T17:30:00+08:00');
  assert.equal(computeDurationMinutes(start, end), 90);
});

test('duration floors partial minutes and never goes negative', () => {
  const start = new Date('2026-10-07T16:00:00+08:00');
  assert.equal(computeDurationMinutes(start, new Date('2026-10-07T16:00:59+08:00')), 0);
  assert.equal(computeDurationMinutes(start, new Date('2026-10-07T15:00:00+08:00')), 0);
});

// --- session fees ----------------------------------------------------------

test('hourly fee is pro rata on the applied rate', () => {
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: 400, durationMinutes: 90 }),
    600,
  );
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: 350, durationMinutes: 30 }),
    175,
  );
});

test('per-session fee is the flat rate regardless of duration', () => {
  assert.equal(
    computeSessionFee({ rateType: 'per_session', appliedRate: 500, durationMinutes: 45 }),
    500,
  );
  assert.equal(
    computeSessionFee({ rateType: 'per_session', appliedRate: 500, durationMinutes: 180 }),
    500,
  );
});

test('fees never go negative and zero duration bills nothing hourly', () => {
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: -100, durationMinutes: 60 }),
    0,
  );
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: 400, durationMinutes: 0 }),
    0,
  );
});

test('hourly fee rounds to two decimals', () => {
  // 50 minutes at 333/hr = 277.5
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: 333, durationMinutes: 50 }),
    277.5,
  );
  // 20 minutes at 333/hr = 111.0
  assert.equal(
    computeSessionFee({ rateType: 'hourly', appliedRate: 333, durationMinutes: 20 }),
    111,
  );
});

// --- billable --------------------------------------------------------------

test('only completed sessions are billable by default', () => {
  assert.equal(defaultBillableFor('completed'), true);
  assert.equal(defaultBillableFor('scheduled'), false);
  assert.equal(defaultBillableFor('student_absent'), false);
  assert.equal(defaultBillableFor('cancelled_by_parent'), false);
  assert.equal(defaultBillableFor('cancelled_by_tutor'), false);
  assert.equal(defaultBillableFor('rescheduled'), false);
});

test('billable may only be overridden on the eligible statuses', () => {
  assert.deepEqual([...BILLABLE_ELIGIBLE_STATUSES], [
    'completed',
    'student_absent',
    'cancelled_by_parent',
  ]);
  assert.equal(canOverrideBillable('student_absent'), true);
  assert.equal(canOverrideBillable('cancelled_by_parent'), true);
  assert.equal(canOverrideBillable('cancelled_by_tutor'), false);
  assert.equal(canOverrideBillable('scheduled'), false);
});

test('a completed session charges even without the billable flag', () => {
  assert.equal(isChargeable(session({ status: 'completed', billable: false })), true);
  assert.equal(sessionCharge(session({ status: 'completed', sessionFee: 600 })), 600);
});

test('a no-show only charges when the tutor marks it billable', () => {
  const absent = { status: 'student_absent' as never, sessionFee: 600 };
  assert.equal(isChargeable({ ...absent, billable: false }), false);
  assert.equal(sessionCharge({ ...absent, billable: false }), 0);
  assert.equal(isChargeable({ ...absent, billable: true }), true);
  assert.equal(sessionCharge({ ...absent, billable: true }), 600);
});

test('cancelled-by-tutor never charges', () => {
  const cancelled = { status: 'cancelled_by_tutor' as never, sessionFee: 600, billable: false };
  assert.equal(isChargeable(cancelled), false);
});

test('gross earnings sum only the chargeable sessions', () => {
  const sessions = [
    session({ status: 'completed', sessionFee: 600 }),
    session({ status: 'completed', sessionFee: 450 }),
    session({ status: 'cancelled_by_tutor', sessionFee: 600 }),
    session({ status: 'student_absent', billable: true, sessionFee: 600 }),
    session({ status: 'student_absent', billable: false, sessionFee: 600 }),
    session({ status: 'scheduled', sessionFee: 600 }),
  ];
  assert.equal(sumSessionCharges(sessions), 1650);
  assert.equal(grossSessionEarnings(sessions), 1650);
});

// --- expenses --------------------------------------------------------------

test('an expense with several dates multiplies the per-occurrence amount', () => {
  // The blueprint example: PHP 40 on Oct 2, 4 and 6 is PHP 120 in total.
  assert.equal(expenseTotal(expense({ amountPerOccurrence: 40, occurrences: 3 })), 120);
});

test('an expense with no dates totals zero', () => {
  assert.equal(expenseTotal(expense({ amountPerOccurrence: 40, occurrences: 0 })), 0);
});

test('reimbursable and non-reimbursable expenses are split correctly', () => {
  const expenses = [
    expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true }),
    expense({ amountPerOccurrence: 100, occurrences: 1, reimbursable: true }),
    expense({ amountPerOccurrence: 250, occurrences: 2, reimbursable: false }),
  ];
  assert.equal(sumReimbursableExpenses(expenses), 220);
  assert.equal(sumNonReimbursableExpenses(expenses), 500);
  assert.equal(tutorCosts(expenses), 500);
});

test('reimbursed expenses include only paid reimbursable costs', () => {
  const expenses = [
    { ...expense({ amountPerOccurrence: 100, occurrences: 1, reimbursable: true }), reimbursementStatus: 'paid' as const },
    { ...expense({ amountPerOccurrence: 80, occurrences: 2, reimbursable: true }), reimbursementStatus: 'included_in_statement' as const },
    { ...expense({ amountPerOccurrence: 50, occurrences: 1, reimbursable: false }), reimbursementStatus: 'paid' as const },
  ];
  assert.equal(sumReimbursedExpenses(expenses), 100);
});

// --- balances --------------------------------------------------------------

test('charges combine session fees and reimbursable expenses only', () => {
  const charges = computeCharges({
    sessions: [session({ status: 'completed', sessionFee: 600 })],
    reimbursableExpenses: [expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true })],
  });
  assert.equal(charges, 720);
});

test('outstanding subtracts payments from charges for one student', () => {
  const outstanding = computeOutstanding({
    sessions: [session({ status: 'completed', sessionFee: 600 })],
    reimbursableExpenses: [expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true })],
    payments: [{ amount: 500 }],
  });
  assert.equal(outstanding, 220);
});

test('outstanding is negative when a parent has overpaid', () => {
  const outstanding = computeOutstanding({
    sessions: [session({ status: 'completed', sessionFee: 300 })],
    reimbursableExpenses: [],
    payments: [{ amount: 500 }],
  });
  assert.equal(outstanding, -200);
});

test('a partially paid student still shows a balance', () => {
  const outstanding = computeOutstanding({
    sessions: [
      session({ status: 'completed', sessionFee: 600 }),
      session({ status: 'completed', sessionFee: 600 }),
    ],
    reimbursableExpenses: [],
    payments: [{ amount: 600 }],
  });
  assert.equal(outstanding, 600);
});

test('payments ignore negative amounts and sum cleanly', () => {
  assert.equal(sumPayments([{ amount: 500 }, { amount: 250 }, { amount: -100 }]), 750);
});

// --- net income ------------------------------------------------------------

test('net income is cash received minus tutor costs', () => {
  const net = netTutorIncome({
    payments: [{ amount: 1200 }],
    expenses: [
      expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true }),
      expense({ amountPerOccurrence: 250, occurrences: 2, reimbursable: false }),
    ],
  });
  // 1200 received, only the 500 of non-reimbursable cost is the tutor's own.
  assert.equal(net, 700);
});

// --- rounding --------------------------------------------------------------

test('rounding keeps float drift out of the ledger', () => {
  assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  assert.equal(roundCurrency(1.005), 1.01);
  assert.equal(roundCurrency(-0.004), -0);
  assert.equal(sumSessionCharges([
    session({ status: 'completed', sessionFee: 0.1 }),
    session({ status: 'completed', sessionFee: 0.2 }),
  ]), 0.3);
});

test('non-finite values degrade to zero rather than NaN', () => {
  assert.equal(roundCurrency(Number.NaN), 0);
  assert.equal(roundCurrency(Number.POSITIVE_INFINITY), 0);
});

// --- dashboard roll-up -----------------------------------------------------

test('monthly summary reports accrual and cash figures separately', () => {
  const summary = monthlySummary({
    sessions: [
      session({ status: 'completed', sessionFee: 600 }),
      session({ status: 'completed', sessionFee: 450 }),
      session({ status: 'student_absent', billable: true, sessionFee: 600 }),
      session({ status: 'cancelled_by_parent', billable: false, sessionFee: 600 }),
    ],
    reimbursableExpenses: [expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true })],
    expenses: [
      expense({ amountPerOccurrence: 40, occurrences: 3, reimbursable: true }),
      expense({ amountPerOccurrence: 250, occurrences: 2, reimbursable: false }),
    ],
    payments: [{ amount: 1000 }],
  });

  assert.equal(summary.grossSessionEarnings, 1650);
  assert.equal(summary.reimbursableExpenses, 120);
  assert.equal(summary.charges, 1770);
  assert.equal(summary.outstanding, 770);
  assert.equal(summary.paymentsReceived, 1000);
  assert.equal(summary.tutorCosts, 500);
  assert.equal(summary.netIncome, 500);
});

test('an empty month summarises to all zeros', () => {
  const summary = monthlySummary({
    sessions: [],
    reimbursableExpenses: [],
    expenses: [],
    payments: [],
  });
  assert.deepEqual(summary, {
    grossSessionEarnings: 0,
    reimbursableExpenses: 0,
    charges: 0,
    outstanding: 0,
    paymentsReceived: 0,
    tutorCosts: 0,
    netIncome: 0,
  });
});
