/**
 * Plan limits — the SINGLE definition.
 *
 * Blueprint section 5. Nothing anywhere else may re-declare a limit. Phase 11
 * exists only to verify that every gate reads from here.
 */

import type { Plan } from '@/types';

export interface PlanLimits {
  /** Only students with status "active" count. */
  maxActiveStudents: number;
  monthlyPdfs: number;
  recurringSessions: boolean;
  reimbursementTracking: boolean;
  advancedAnalytics: boolean;
  studentProgress: boolean;
  customStatements: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxActiveStudents: 2,
    monthlyPdfs: 2,
    recurringSessions: false,
    reimbursementTracking: false,
    advancedAnalytics: false,
    studentProgress: false,
    customStatements: false,
  },
  pro: {
    maxActiveStudents: Number.POSITIVE_INFINITY,
    monthlyPdfs: Number.POSITIVE_INFINITY,
    recurringSessions: true,
    reimbursementTracking: true,
    advancedAnalytics: true,
    studentProgress: true,
    customStatements: true,
  },
};

/** Defensive lookup: an unknown plan degrades to Free, never to Pro. */
export function limitsFor(plan: Plan | null | undefined): PlanLimits {
  if (plan === 'pro') return PLAN_LIMITS.pro;
  return PLAN_LIMITS.free;
}

/** Pricing is not final and must stay configurable. Blueprint section 5. */
export const PRICING = {
  currency: 'PHP',
  symbol: '₱',
  trialDays: 15,
  options: [
    { id: 'monthly', label: '1 month', amount: 29, days: 30 },
    { id: 'half_year', label: '6 months', amount: 99, days: 182 },
    { id: 'yearly', label: '1 year', amount: 199, days: 365 },
  ],
} as const;
