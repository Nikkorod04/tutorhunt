/**
 * Entitlement model. Blueprint section 6.
 *
 * This document is separate from users/{uid} precisely because the user
 * document is owner-writable. The client may create this only as "free" and
 * may update only the two usage fields; plan, proUntil and trialEndsAt are
 * client-immutable and are set through the Admin SDK.
 */

import type { MonthKey } from './common';
import type { Plan } from './user';

export interface Entitlement {
  uid: string;
  plan: Plan;
  proUntil: Date | null;
  trialEndsAt: Date | null;
  usageMonth: MonthKey;
  pdfStatementsThisMonth: number;
  updatedAt: Date;
}
