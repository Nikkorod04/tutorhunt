/**
 * User document model.
 *
 * Blueprint section 9. Note what is deliberately absent: plan, proUntil and
 * the usage counters live in entitlements/{uid}, and the active student count
 * is derived rather than stored. See sections 6 and 7.3.
 */

export type Role = 'tutor' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type Plan = 'free' | 'pro';
export type TutorAvatarId = 'default' | 'animal-01' | 'animal-02' | 'animal-03' | 'animal-04' | 'animal-05' | 'custom';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  /** Google profile photo or the user's uploaded account photo. */
  photoUrl: string | null;
  /** Built-in tutor avatar or a privately uploaded custom avatar. */
  avatarId: TutorAvatarId;
  customAvatarUrl: string | null;
  /** Immutable after account creation, enforced by the security rules. */
  role: Role;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
