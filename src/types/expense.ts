/**
 * Expense model. Blueprint section 15.
 *
 * amountPerOccurrence is the cost of ONE occurrence, so an expense total is
 * amountPerOccurrence * expenseDates.length. The v1.0 field named `amount` was
 * ambiguous about this and has been removed.
 */

export type ExpenseCategory =
  | 'transportation'
  | 'materials'
  | 'printing'
  | 'food'
  | 'school_supplies'
  | 'other';

export type ReimbursementStatus = 'not_requested' | 'included_in_statement' | 'paid';

export interface Expense {
  id: string;
  studentId: string | null;
  title: string;
  category: ExpenseCategory;
  amountPerOccurrence: number;
  expenseDates: Date[];
  notes: string;
  receiptUrl: string | null;
  reimbursable: boolean;
  reimbursementStatus: ReimbursementStatus;
  statementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
