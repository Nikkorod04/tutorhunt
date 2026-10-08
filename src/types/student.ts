/** Student model. Blueprint section 10. */

import type { RateType } from './common';

/**
 * Blueprint section 7.8 lists a neutral default alongside boy and girl, but
 * section 10's enum omitted it. Both are honoured here so a tutor can pick a
 * neutral avatar rather than being pushed towards uploading a photo of a child.
 */
export type AvatarType = 'boy' | 'girl' | 'neutral' | 'custom';
export type StudentStatus = 'active' | 'inactive' | 'archived';

export interface Student {
  id: string;
  nickname: string;
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
