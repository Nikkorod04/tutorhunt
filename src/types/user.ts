/**
 * User document model.
 *
 * Blueprint section 9. Note what is deliberately absent: plan, proUntil and
 * the usage counters live in entitlements/{uid}, and the active student count
 * is derived rather than stored. See sections 6 and 7.3.
 */

export type Role = 'tutor' | 'parent' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type Plan = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  /** Immutable after account creation, enforced by the security rules. */
  role: Role;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
