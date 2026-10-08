/** Earnings and balance roll-ups. Blueprint sections 17 and 35. */

import type { Expense, Payment, Session, Student } from '@/types';
import {
  computeCharges,
  computeOutstanding,
  monthlySummary,
  sumReimbursedExpenses,
  sumPayments,
  type MonthlySummary,
} from '@/utils/pricing';
import { manilaMonthRange, manilaParts } from '@/utils/date';
import { listAllExpenses } from './expenses.service';
import { listAllPayments } from './payments.service';
import { listAllSessions } from './sessions.service';

export interface StudentBalance {
  studentId: string;
  studentName: string;
  charges: number;
  paymentsReceived: number;
  outstanding: number;
}

export interface EarningsSnapshot extends MonthlySummary {
  monthKey: string;
  sessionCount: number;
  tutoringMinutes: number;
  sessions: Session[];
  expenses: Expense[];
  payments: Payment[];
  studentBalances: StudentBalance[];
  reimbursedExpenses: number;
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function expenseAnchor(expense: Expense): Date {
  const validDates = expense.expenseDates.filter((date) => !Number.isNaN(date.getTime()));
  return [...validDates].sort((left, right) => left.getTime() - right.getTime())[0]
    ?? expense.createdAt;
}

function monthKey(date: Date): string {
  const parts = manilaParts(date);
  return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}`;
}

export async function getEarningsSnapshot(
  tutorUid: string,
  month: Date,
  students: Student[],
): Promise<EarningsSnapshot> {
  const [allSessions, allExpenses, allPayments] = await Promise.all([
    listAllSessions(tutorUid),
    listAllExpenses(tutorUid),
    listAllPayments(tutorUid),
  ]);
  const { start, end } = manilaMonthRange(month);

  const sessions = allSessions.filter((session) => isInRange(session.startsAt, start, end));
  const expenses = allExpenses.filter((expense) => isInRange(expenseAnchor(expense), start, end));
  const payments = allPayments.filter((payment) => isInRange(payment.datePaid, start, end));
  const allStudentBalances = students.map((student) => {
    const studentSessions = allSessions.filter((session) => session.studentId === student.id);
    const studentExpenses = allExpenses.filter(
      (expense) => expense.studentId === student.id && expense.reimbursable,
    );
    const studentPayments = allPayments.filter((payment) => payment.studentId === student.id);
    const charges = computeCharges({
      sessions: studentSessions,
      reimbursableExpenses: studentExpenses,
    });

    return {
      studentId: student.id,
      studentName: student.nickname,
      charges,
      paymentsReceived: sumPayments(studentPayments),
      outstanding: computeOutstanding({
        sessions: studentSessions,
        reimbursableExpenses: studentExpenses,
        payments: studentPayments,
      }),
    };
  });

  const summary = monthlySummary({
    sessions,
    reimbursableExpenses: expenses.filter((expense) => expense.reimbursable),
    expenses,
    payments,
  });

  return {
    ...summary,
    // Outstanding is a dashboard-wide all-time balance, not just this
    // month's charges. This follows the per-student ledger rule in section 16.
    outstanding: allStudentBalances.reduce((total, item) => total + item.outstanding, 0),
    monthKey: monthKey(month),
    sessionCount: sessions.length,
    tutoringMinutes: sessions.reduce((total, session) => total + session.durationMinutes, 0),
    sessions,
    expenses,
    payments,
    studentBalances: allStudentBalances,
    reimbursedExpenses: sumReimbursedExpenses(expenses.filter((expense) => expense.reimbursable)),
  };
}
