import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  activePlanFor,
  daysUntilProExpiry,
  limitsFor,
  PRICING,
} from '../src/constants/plans.ts';

const now = new Date('2026-10-09T00:00:00.000Z');

test('expired Pro access falls back to Free limits', () => {
  assert.equal(activePlanFor({ plan: 'pro', proUntil: new Date('2026-10-08T23:59:59.000Z') }, now), 'free');
  assert.equal(limitsFor('free').maxActiveStudents, 2);
  assert.equal(limitsFor('free').monthlyPdfs, 2);
  assert.equal(limitsFor('free').reimbursementTracking, true);
});

test('future or non-expiring Pro access grants Pro limits', () => {
  assert.equal(activePlanFor({ plan: 'pro', proUntil: new Date('2026-10-10T00:00:00.000Z') }, now), 'pro');
  assert.equal(activePlanFor({ plan: 'pro', proUntil: null }, now), 'pro');
  assert.equal(limitsFor('pro').recurringSessions, true);
  assert.equal(limitsFor('pro').reimbursementTracking, true);
});

test('locked pricing remains configurable and exact', () => {
  assert.deepEqual(
    PRICING.options.map(({ amount, days }) => ({ amount, days })),
    [
      { amount: 29, days: 30 },
      { amount: 149, days: 182 },
      { amount: 249, days: 365 },
    ],
  );
});

test('Pro expiry copy reports whole days remaining', () => {
  assert.equal(daysUntilProExpiry(new Date('2026-10-12T00:00:00.000Z'), now), 3);
  assert.equal(daysUntilProExpiry(null, now), null);
});
