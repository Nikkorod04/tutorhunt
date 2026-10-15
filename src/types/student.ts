/** Student model. Blueprint section 10. */

import type { RateType } from './common';

export type StudentGender = 'male' | 'female';
export type StudentAvatarId =
  | 'default'
  | 'male-01'
  | 'male-02'
  | 'male-03'
  | 'male-04'
  | 'male-05'
  | 'female-01'
  | 'female-02'
  | 'female-03'
  | 'female-04'
  | 'female-05'
  | 'custom';

/** Legacy values are accepted while older Firestore documents are migrated. */
export type LegacyAvatarType = 'boy' | 'girl' | 'neutral';
export type AvatarType = StudentAvatarId | LegacyAvatarType;
export type StudentStatus = 'active' | 'inactive' | 'archived';

export interface Student {
  id: string;
  nickname: string;
  gender: StudentGender | null;
  avatarType: AvatarType;
  customAvatarUrl: string | null;
  /** Age is never stored; it is calculated from this at render time. */
  birthday: Date | null;
  school: string;
  gradeLevel: string;
  parentGuardianName: string;
  parentContact: string;
  tutoringPlace: string;
  rateType: RateType;
  defaultRate: number;
  notes: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}
