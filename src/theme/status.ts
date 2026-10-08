/**
 * Domain status to design tone mapping.
 *
 * Status is never expressed as bare coloured text. Every status is a chip
 * carrying a tone, an icon and a label, so meaning survives for colour-blind
 * users and in greyscale.
 *
 * Source of truth: DESIGN_PLAN.md section 3.1.3
 */

import type { Expense, Plan, SessionStatus } from '@/types';
import type { Tone } from './colors';

export const sessionStatusTone: Record<SessionStatus, Tone> = {
  scheduled: 'info',
  completed: 'success',
  cancelled_by_tutor: 'neutral',
  cancelled_by_parent: 'warning',
  student_absent: 'danger',
  rescheduled: 'premium',
};

export const sessionStatusLabel: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled_by_tutor: 'Cancelled by you',
  cancelled_by_parent: 'Cancelled by parent',
  student_absent: 'Student absent',
  rescheduled: 'Rescheduled',
};

export const sessionStatusIcon = {
  scheduled: 'time-outline',
  completed: 'checkmark-circle-outline',
  cancelled_by_tutor: 'close-circle-outline',
  cancelled_by_parent: 'close-circle-outline',
  student_absent: 'alert-circle-outline',
  rescheduled: 'calendar-outline',
} as const satisfies Record<SessionStatus, string>;

export const reimbursementStatusTone: Record<Expense['reimbursementStatus'], Tone> = {
  not_requested: 'neutral',
  included_in_statement: 'premium',
  paid: 'success',
};

export const reimbursementStatusLabel: Record<Expense['reimbursementStatus'], string> = {
  not_requested: 'Not requested',
  included_in_statement: 'On statement',
  paid: 'Reimbursed',
};

export const planTone: Record<Plan, Tone> = {
  free: 'neutral',
  pro: 'premium',
};

export const planLabel: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
};
