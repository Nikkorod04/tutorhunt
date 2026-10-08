/** Public tutor profile. Private student, session, earnings and payment data never belongs here. */

export type TutoringMode = 'face_to_face' | 'online';
export type ContactPreference = 'messenger' | 'facebook' | 'phone' | 'email';

export interface TutorProfile {
  uid: string;
  displayName: string;
  profilePhotoUrl: string | null;
  shortBio: string;
  subjects: string[];
  gradeLevels: string[];
  primarySubject: string;
  gradeBand: string;
  city: string;
  province: 'Leyte' | 'Samar';
  barangaysServed: string[];
  servesAllBarangays: boolean;
  areasServed: string[];
  primaryMode: TutoringMode;
  tutoringModes: TutoringMode[];
  rateFrom: number | null;
  minRate: number | null;
  maxRate: number | null;
  education: string;
  experienceSummary: string;
  contactPreference: ContactPreference;
  contactValue: string;
  rating: number;
  reviewCount: number;
  identityVerified: boolean;
  credentialsVerified: boolean;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}
