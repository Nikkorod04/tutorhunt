/**
 * Pure validation. Blueprint section 40.
 *
 * Deliberately free of React Native imports and uses only `import type`, so a
 * type-stripping runtime can execute it directly for unit tests — the same
 * arrangement as utils/pricing.ts.
 *
 * Screens render the messages; they never re-implement the rules.
 */

import type { ExpenseCategory, PaymentMethod, RateType } from '@/types';

export interface ValidationIssue {
  /** Matches the form field key so a screen can attach the message. */
  field: string;
  message: string;
}

export const LIMITS = {
  nickname: 60,
  school: 120,
  gradeLevel: 40,
  parentGuardianName: 80,
  parentContact: 120,
  tutoringPlace: 120,
  notes: 1000,
  subject: 100,
  topicDetails: 500,
  expenseTitle: 120,
  paymentReference: 120,
} as const;

export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isFutureDate(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime();
}

export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function exceedsLength(value: string | null | undefined, max: number): boolean {
  return (value?.length ?? 0) > max;
}

/**
 * Parses a rate typed by a tutor. Tolerates the peso sign, thousands
 * separators and stray spaces, because people type "₱1,200".
 * Returns null when the input is empty or not a number.
 */
export function parseRate(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const cleaned = trimmed.replace(/[₱,\s]/g, '');
  if (cleaned.length === 0) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Parses 12-hour h:mm AM/PM input, while accepting legacy 24-hour HH:MM values. */
export function parseClockTime(raw: string): { hours: number; minutes: number } | null {
  const trimmed = raw.trim();
  const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  if (twelveHourMatch) {
    const hour = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) return null;
    const period = twelveHourMatch[3].toUpperCase();
    return { hours: period === 'AM' ? hour % 12 : (hour % 12) + 12, minutes };
  }

  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!twentyFourHourMatch) return null;
  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export interface StudentFormValues {
  nickname: string;
  birthday: Date | null;
  school: string;
  gradeLevel: string;
  parentGuardianName: string;
  parentContact: string;
  tutoringPlace: string;
  /** Raw text straight from the field. */
  defaultRate: string;
  rateType: RateType;
  notes: string;
}

export interface SessionFormValues {
  studentId: string;
  date: Date | null;
  startTime: string;
  endTime: string;
  subject: string;
  topicDetails: string;
  appliedRate: string;
}

export interface ExpenseFormValues {
  studentId: string | null;
  title: string;
  category: ExpenseCategory;
  amountPerOccurrence: string;
  expenseDates: Date[];
  notes: string;
  reimbursable: boolean;
}

export interface PaymentFormValues {
  studentId: string;
  amount: string;
  datePaid: Date | null;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

export function validateExpense(values: ExpenseFormValues): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(values.title)) {
    issues.push({ field: 'title', message: 'A title is required.' });
  } else if (exceedsLength(values.title, LIMITS.expenseTitle)) {
    issues.push({ field: 'title', message: `Title must be under ${LIMITS.expenseTitle} characters.` });
  }

  const amount = parseRate(values.amountPerOccurrence);
  if (amount === null || amount <= 0) {
    issues.push({ field: 'amountPerOccurrence', message: 'Amount must be greater than zero.' });
  }
  if (values.expenseDates.length === 0) {
    issues.push({ field: 'expenseDates', message: 'Add at least one expense date.' });
  }
  if (values.reimbursable && !values.studentId) {
    issues.push({ field: 'studentId', message: 'Choose a student for reimbursable expenses.' });
  }
  if (exceedsLength(values.notes, LIMITS.notes)) {
    issues.push({ field: 'notes', message: `Notes must be under ${LIMITS.notes} characters.` });
  }

  return issues;
}

export function validatePayment(values: PaymentFormValues): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(values.studentId)) {
    issues.push({ field: 'studentId', message: 'Choose a student.' });
  }

  const amount = parseRate(values.amount);
  if (amount === null || amount <= 0) {
    issues.push({ field: 'amount', message: 'Payment amount must be greater than zero.' });
  }

  if (!values.datePaid) {
    issues.push({ field: 'datePaid', message: 'A payment date is required.' });
  }

  if (exceedsLength(values.reference, LIMITS.paymentReference)) {
    issues.push({ field: 'reference', message: `Reference must be under ${LIMITS.paymentReference} characters.` });
  }

  if (exceedsLength(values.notes, LIMITS.notes)) {
    issues.push({ field: 'notes', message: `Notes must be under ${LIMITS.notes} characters.` });
  }

  return issues;
}

export function validateSession(values: SessionFormValues): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (isBlank(values.studentId)) issues.push({ field: 'studentId', message: 'Choose a student.' });
  if (!values.date) issues.push({ field: 'date', message: 'A session date is required.' });

  const start = parseClockTime(values.startTime);
  const end = parseClockTime(values.endTime);
  if (!start) issues.push({ field: 'startTime', message: 'Enter a time like 4:00 PM.' });
  if (!end) issues.push({ field: 'endTime', message: 'Enter a time like 5:30 PM.' });
  if (start && end && end.hours * 60 + end.minutes <= start.hours * 60 + start.minutes) {
    issues.push({ field: 'endTime', message: 'End time must be after start time.' });
  }

  if (isBlank(values.subject)) {
    issues.push({ field: 'subject', message: 'A subject is required.' });
  } else if (exceedsLength(values.subject, LIMITS.subject)) {
    issues.push({ field: 'subject', message: `Subject must be under ${LIMITS.subject} characters.` });
  }

  if (exceedsLength(values.topicDetails, LIMITS.topicDetails)) {
    issues.push({ field: 'topicDetails', message: `Topic details must be under ${LIMITS.topicDetails} characters.` });
  }

  const rate = parseRate(values.appliedRate);
  if (rate === null) {
    issues.push({ field: 'appliedRate', message: 'A numeric rate is required.' });
  } else if (!isNonNegativeFinite(rate)) {
    issues.push({ field: 'appliedRate', message: 'Rate cannot be negative.' });
  }
  return issues;
}

/**
 * Student rules from section 40: nickname required, birthday cannot be in the
 * future, defaultRate >= 0. Length caps come from section 40's v1.1 addition.
 */
export function validateStudent(
  values: StudentFormValues,
  now: Date = new Date(),
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(values.nickname)) {
    issues.push({ field: 'nickname', message: 'A nickname is required.' });
  } else if (exceedsLength(values.nickname, LIMITS.nickname)) {
    issues.push({
      field: 'nickname',
      message: `Keep the nickname under ${LIMITS.nickname} characters.`,
    });
  }

  if (values.birthday && isFutureDate(values.birthday, now)) {
    issues.push({ field: 'birthday', message: 'Birthday cannot be in the future.' });
  }

  const rate = parseRate(values.defaultRate);
  if (rate === null) {
    if (!isBlank(values.defaultRate)) {
      issues.push({ field: 'defaultRate', message: 'Rate must be a number.' });
    }
  } else if (!isNonNegativeFinite(rate)) {
    issues.push({ field: 'defaultRate', message: 'Rate cannot be negative.' });
  }

  const lengthChecks: [keyof StudentFormValues, number, string][] = [
    ['school', LIMITS.school, 'School'],
    ['gradeLevel', LIMITS.gradeLevel, 'Grade level'],
    ['parentGuardianName', LIMITS.parentGuardianName, 'Parent or guardian name'],
    ['parentContact', LIMITS.parentContact, 'Parent contact'],
    ['tutoringPlace', LIMITS.tutoringPlace, 'Tutoring place'],
    ['notes', LIMITS.notes, 'Notes'],
  ];

  for (const [field, max, label] of lengthChecks) {
    const value = values[field];
    if (typeof value === 'string' && exceedsLength(value, max)) {
      issues.push({ field, message: `${label} must be under ${max} characters.` });
    }
  }

  return issues;
}

/** Turns an issue list into a `{ field: message }` map for a form. */
export function issuesByField(issues: readonly ValidationIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    if (!map[issue.field]) map[issue.field] = issue.message;
  }
  return map;
}

export function hasErrors(issues: readonly ValidationIssue[]): boolean {
  return issues.length > 0;
}
