/**
 * Entitlements.
 *
 * plan and proUntil live in entitlements/{uid}, never in users/{uid}. The
 * client can read this document, create it only as Free, and update only the
 * usage fields (blueprint sections 6, 31 and 32).
 *
 * The app never writes `plan`. Pro is activated through the Admin SDK.
 */

import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import type { Entitlement } from '@/types';
import { currentManilaMonthKey } from '@/utils/date';
import { getDb } from './firebase';
import { fetchEntitlement } from './auth.service';

/** Returns the entitlement, creating a Free one if it is somehow missing. */
export async function ensureEntitlement(uid: string): Promise<Entitlement> {
  const existing = await fetchEntitlement(uid);
  if (existing) return existing;

  await setDoc(doc(getDb(), 'entitlements', uid), {
    uid,
    plan: 'free',
    proUntil: null,
    trialEndsAt: null,
    usageMonth: currentManilaMonthKey(),
    pdfStatementsThisMonth: 0,
    updatedAt: serverTimestamp(),
  });

  const created = await fetchEntitlement(uid);
  if (!created) throw new Error('Could not create the entitlement document.');
  return created;
}

export interface QuotaState {
  /** True when the current month key differs from the stored one. */
  monthRolled: boolean;
  /** Usage counted against the current month. */
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}

export function quotaState(entitlement: Entitlement, limit: number, now: Date = new Date()): QuotaState {
  const monthRolled = entitlement.usageMonth !== currentManilaMonthKey(now);
  const used = monthRolled ? 0 : entitlement.pdfStatementsThisMonth;
  const unlimited = !Number.isFinite(limit);
  const remaining = unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

  return {
    monthRolled,
    used,
    limit,
    remaining,
    exhausted: !unlimited && used >= limit,
  };
}

/**
 * Records one generated statement.
 *
 * KNOWN LIMITATION: this runs on the client. The rules stop the counter from
 * being lowered within a month, but they cannot stop a client from advancing
 * usageMonth to reset it, because rules cannot compute the Manila month from
 * request.time. Closing that gap needs a Cloud Function (blueprint section 32).
 * The quota is therefore a product limit, not a security boundary.
 */
export async function consumeStatementQuota(
  uid: string,
  current: Entitlement,
  now: Date = new Date(),
): Promise<Entitlement> {
  const month = currentManilaMonthKey(now);
  const rolled = current.usageMonth !== month;

  const next = {
    usageMonth: month,
    pdfStatementsThisMonth: rolled ? 1 : current.pdfStatementsThisMonth + 1,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(getDb(), 'entitlements', uid), next, { merge: true });

  return {
    ...current,
    usageMonth: month,
    pdfStatementsThisMonth: next.pdfStatementsThisMonth,
    updatedAt: new Date(),
  };
}

/** True when the entitlement grants Pro right now. */
export function isPro(entitlement: Entitlement | null, now: Date = new Date()): boolean {
  if (!entitlement) return false;
  if (entitlement.plan !== 'pro') return false;
  if (!entitlement.proUntil) return true;
  return entitlement.proUntil.getTime() > now.getTime();
}
