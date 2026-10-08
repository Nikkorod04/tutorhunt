export type ParentPostTutoringMode = 'face_to_face' | 'online' | 'either';
export type ParentPostBudgetType = 'hourly' | 'per_session' | 'negotiable';
export type ParentPostStatus = 'open' | 'closed';
export type ParentPostInterestStatus = 'active' | 'withdrawn';

export interface ParentPost {
  id: string;
  parentUid: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  city: string;
  area: string;
  scheduleText: string;
  tutoringMode: ParentPostTutoringMode;
  budgetType: ParentPostBudgetType;
  minBudget: number | null;
  maxBudget: number | null;
  contactVisible: boolean;
  status: ParentPostStatus;
  createdAt: Date;
  /** Set only when the parent edits the request details. */
  editedAt: Date | null;
  updatedAt: Date;
}

export interface ParentPostInterest {
  id: string;
  postId: string;
  tutorUid: string;
  parentUid: string;
  message: string;
  status: ParentPostInterestStatus;
  createdAt: Date;
  updatedAt: Date;
}
