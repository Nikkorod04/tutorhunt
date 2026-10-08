/**
 * Unit tests for the student validation rules. Blueprint section 40.
 *
 * Run with:  npm test
 *
 * validation.ts is pure and uses only `import type`, so Node executes the
 * TypeScript directly by stripping types. The explicit `.ts` extension on the
 * import is required by that runtime.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  exceedsLength,
  hasErrors,
  isBlank,
  isFutureDate,
  isNonNegativeFinite,
  issuesByField,
  LIMITS,
  parseRate,
  parseClockTime,
  validateSession,
  validatePayment,
  validateStudent,
  type PaymentFormValues,
  type StudentFormValues,
} from '../src/utils/validation.ts';

const NOW = new Date('2026-10-07T12:00:00+08:00');

function values(over: Partial<StudentFormValues> = {}): StudentFormValues {
  return {
    nickname: 'Ana',
    birthday: null,
    school: '',
    gradeLevel: '',
    parentGuardianName: '',
    parentContact: '',
    tutoringPlace: '',
    defaultRate: '',
    rateType: 'hourly',
    notes: '',
    ...over,
  };
}

// --- primitives ------------------------------------------------------------

test('isBlank treats whitespace-only as blank', () => {
  assert.equal(isBlank(''), true);
  assert.equal(isBlank('   '), true);
  assert.equal(isBlank(null), true);
  assert.equal(isBlank(undefined), true);
  assert.equal(isBlank('Ana'), false);
});

test('isFutureDate compares against the supplied now', () => {
  assert.equal(isFutureDate(new Date('2026-10-08T00:00:00+08:00'), NOW), true);
  assert.equal(isFutureDate(new Date('2026-10-06T00:00:00+08:00'), NOW), false);
  assert.equal(isFutureDate(NOW, NOW), false);
});

test('isNonNegativeFinite rejects negatives and non-numbers', () => {
  assert.equal(isNonNegativeFinite(0), true);
  assert.equal(isNonNegativeFinite(350), true);
  assert.equal(isNonNegativeFinite(-1), false);
  assert.equal(isNonNegativeFinite(Number.NaN), false);
  assert.equal(isNonNegativeFinite(Number.POSITIVE_INFINITY), false);
});

test('exceedsLength is strict about the boundary', () => {
  assert.equal(exceedsLength('abc', 3), false);
  assert.equal(exceedsLength('abcd', 3), true);
  assert.equal(exceedsLength('', 3), false);
  assert.equal(exceedsLength(undefined, 3), false);
});

// --- rate parsing ----------------------------------------------------------

test('parseRate tolerates the peso sign and thousands separators', () => {
  assert.equal(parseRate('350'), 350);
  assert.equal(parseRate('₱1,200'), 1200);
  assert.equal(parseRate('  ₱ 1,200.50  '), 1200.5);
  assert.equal(parseRate('0'), 0);
});

test('parseRate returns null for empty or non-numeric input', () => {
  assert.equal(parseRate(''), null);
  assert.equal(parseRate('   '), null);
  assert.equal(parseRate('₱'), null);
  assert.equal(parseRate('abc'), null);
});

test('clock input accepts valid 24-hour times and rejects invalid times', () => {
  assert.deepEqual(parseClockTime('16:30'), { hours: 16, minutes: 30 });
  assert.deepEqual(parseClockTime('9:05'), { hours: 9, minutes: 5 });
  assert.equal(parseClockTime('24:00'), null);
  assert.equal(parseClockTime('4 PM'), null);
});

test('session validation requires a student, date, subject and numeric rate', () => {
  const issues = validateSession({
    studentId: '', date: null, startTime: '16:00', endTime: '17:00',
    subject: '', topicDetails: '', appliedRate: '',
  });
  assert.deepEqual(issues.map((issue) => issue.field).sort(), [
    'appliedRate', 'date', 'studentId', 'subject',
  ]);
});

test('session validation rejects an end time before its start', () => {
  const issues = validateSession({
    studentId: 'student-1', date: NOW, startTime: '17:00', endTime: '16:00',
    subject: 'Math', topicDetails: '', appliedRate: '350',
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, 'endTime');
});

// --- student validation ----------------------------------------------------

test('a minimal valid student produces no issues', () => {
  assert.deepEqual(validateStudent(values(), NOW), []);
});

test('nickname is required', () => {
  const issues = validateStudent(values({ nickname: '   ' }), NOW);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, 'nickname');
  assert.match(issues[0].message, /required/i);
});

test('nickname over the cap is rejected', () => {
  const issues = validateStudent(values({ nickname: 'a'.repeat(LIMITS.nickname + 1) }), NOW);
  assert.equal(issues[0].field, 'nickname');
  assert.match(issues[0].message, /under 60/);
});

test('a birthday in the future is rejected', () => {
  const issues = validateStudent(
    values({ birthday: new Date('2030-01-01T00:00:00+08:00') }),
    NOW,
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, 'birthday');
  assert.match(issues[0].message, /future/i);
});

test('a past birthday is accepted', () => {
  assert.deepEqual(
    validateStudent(values({ birthday: new Date('2016-05-02T00:00:00+08:00') }), NOW),
    [],
  );
});

test('a negative rate is rejected', () => {
  const issues = validateStudent(values({ defaultRate: '-100' }), NOW);
  assert.equal(issues[0].field, 'defaultRate');
  assert.match(issues[0].message, /negative/i);
});

test('a non-numeric rate is rejected but an empty rate is allowed', () => {
  assert.equal(validateStudent(values({ defaultRate: 'abc' }), NOW)[0].field, 'defaultRate');
  assert.deepEqual(validateStudent(values({ defaultRate: '' }), NOW), []);
});

test('a rate of zero is allowed', () => {
  assert.deepEqual(validateStudent(values({ defaultRate: '0' }), NOW), []);
});

test('over-long free-text fields are each reported', () => {
  const issues = validateStudent(
    values({
      school: 's'.repeat(LIMITS.school + 1),
      notes: 'n'.repeat(LIMITS.notes + 1),
    }),
    NOW,
  );
  const fields = issues.map((i) => i.field).sort();
  assert.deepEqual(fields, ['notes', 'school']);
});

test('multiple problems are all reported at once', () => {
  const issues = validateStudent(
    values({ nickname: '', defaultRate: '-5', birthday: new Date('2031-01-01T00:00:00+08:00') }),
    NOW,
  );
  assert.equal(issues.length, 3);
  assert.deepEqual(issues.map((i) => i.field).sort(), ['birthday', 'defaultRate', 'nickname']);
});

test('issuesByField keeps the first message per field', () => {
  const map = issuesByField([
    { field: 'nickname', message: 'first' },
    { field: 'nickname', message: 'second' },
    { field: 'notes', message: 'other' },
  ]);
  assert.equal(map.nickname, 'first');
  assert.equal(map.notes, 'other');
});

test('hasErrors reflects whether anything was reported', () => {
  assert.equal(hasErrors([]), false);
  assert.equal(hasErrors([{ field: 'x', message: 'y' }]), true);
});

test('payment validation requires a student, amount and payment date', () => {
  const values: PaymentFormValues = {
    studentId: '',
    amount: '',
    datePaid: null,
    method: 'cash',
    reference: '',
    notes: '',
  };
  assert.deepEqual(validatePayment(values).map((issue) => issue.field).sort(), [
    'amount', 'datePaid', 'studentId',
  ]);
});

test('a valid payment produces no validation issues', () => {
  assert.deepEqual(validatePayment({
    studentId: 'student-1',
    amount: '500',
    datePaid: NOW,
    method: 'gcash',
    reference: 'GC-123',
    notes: '',
  }), []);
});
