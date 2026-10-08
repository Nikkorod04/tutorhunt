/**
 * Payment model. Blueprint section 16.
 *
 * Payments are the single source of truth for money received. There is no
 * per-session allocation: a payment is recorded against a student.
 */

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank' | 'other';

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  datePaid: Date;
  method: PaymentMethod;
  reference: string;
  notes: string;
  createdAt: Date;
}
