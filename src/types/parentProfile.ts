import type { ContactPreference } from './tutorProfile';

export interface ParentProfile {
  uid: string;
  displayName: string;
  city: string;
  province: 'Leyte' | 'Samar';
  barangay: string;
  contactPreference: ContactPreference;
  contactValue: string;
  contactVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}
