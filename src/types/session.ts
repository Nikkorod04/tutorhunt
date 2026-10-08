/**
 * Session model. Blueprint section 12.
 *
 * v1.1 changes reflected here: startsAt/endsAt are real dates rather than
 * free-text time strings, amountPaid and paymentStatus are gone (payments are
 * the single source of truth at student level), and billable is new.
 */

import type { RateType } from './common';

export type SessionStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled_by_tutor'
  | 'cancelled_by_parent'
  | 'student_absent'
  | 'rescheduled';

export type TopicCategory =
  | 'assignment'
  | 'spelling'
  | 'reading'
  | 'writing'
  | 'review'
  | 'exam_preparation'
  | 'project'
  | 'other';

export interface Session {
  id: string;
  studentId: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  subject: string;
  topicCategory: TopicCategory;
  topicDetails: string;
  notes: string;
  rateType: RateType;
  appliedRate: number;
  sessionFee: number;
  /** Tutor override allowing a no-show or late cancellation to be charged. */
  billable: boolean;
  status: SessionStatus;
  rescheduledToId: string | null;
  recurringGroupId: string | null;
  /** True when a tutor manually edited a generated session. */
  recurringSessionModified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RecurringSeriesStatus = 'active' | 'ended' | 'cancelled';

export interface RecurringSeries {
  id: string;
  studentId: string;
  weekdays: number[];
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  subject: string;
  topicCategory: TopicCategory;
  rateType: RateType;
  appliedRate: number;
  skipDates: Date[];
  generatedSessionIds: string[];
  status: RecurringSeriesStatus;
  createdAt: Date;
  updatedAt: Date;
}
