import type { Session } from '@/types';
import { sessionStatusLabel } from '@/theme/status';
import { formatIsoDate } from './date';

export type SessionTimingKind = 'upcoming' | 'ongoing' | 'overdue' | 'completed' | 'other';

export interface SessionTiming {
  kind: SessionTimingKind;
  label: string;
  isActionable: boolean;
}

export function formatTimeRemaining(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = hours === 1 ? 'hr' : 'hrs';
  const minuteLabel = minutes === 1 ? 'min' : 'mins';

  if (hours === 0) return `In ${minutes} ${minuteLabel}`;
  if (minutes === 0) return `In ${hours} ${hourLabel}`;
  return `In ${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

export function getSessionTiming(session: Session, now: Date = new Date()): SessionTiming {
  if (session.status === 'scheduled') {
    if (now.getTime() < session.startsAt.getTime()) {
      return { kind: 'upcoming', label: formatTimeRemaining(session.startsAt.getTime() - now.getTime()), isActionable: false };
    }
    if (now.getTime() <= session.endsAt.getTime()) {
      return { kind: 'ongoing', label: 'Happening now', isActionable: true };
    }
    return { kind: 'overdue', label: 'Past scheduled time', isActionable: true };
  }

  if (session.status === 'completed') {
    return {
      kind: 'completed',
      label: formatIsoDate(session.startsAt) === formatIsoDate(now) ? 'Completed today' : 'Completed',
      isActionable: false,
    };
  }

  return { kind: 'other', label: sessionStatusLabel[session.status], isActionable: false };
}

export function formatSessionTimingHeading(timing: SessionTiming, tutoringPlace?: string | null): string {
  const location = tutoringPlace?.trim();
  return location ? `${timing.label} · ${location}` : timing.label;
}

export function sessionDisplayPriority(session: Session, now: Date = new Date()): number {
  const timing = getSessionTiming(session, now);
  if (timing.kind === 'upcoming' || timing.kind === 'ongoing') return 0;
  if (timing.kind === 'overdue') return 1;
  return 2;
}

/** Upcoming and active sessions first, overdue next, then history newest first. */
export function compareSessionsForDisplay(left: Session, right: Session, now: Date = new Date()): number {
  const priorityDifference = sessionDisplayPriority(left, now) - sessionDisplayPriority(right, now);
  if (priorityDifference !== 0) return priorityDifference;

  const leftPriority = sessionDisplayPriority(left, now);
  if (leftPriority === 0) return left.startsAt.getTime() - right.startsAt.getTime();
  return right.startsAt.getTime() - left.startsAt.getTime();
}
