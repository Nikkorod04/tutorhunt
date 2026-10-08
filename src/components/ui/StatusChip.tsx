/**
 * Status chips built from the domain mappings.
 *
 * Screens use these rather than assembling a Chip by hand, so a status can
 * never be rendered with the wrong tone, the wrong label, or without its icon.
 */

import React from 'react';

import {
  planLabel,
  planTone,
  reimbursementStatusLabel,
  reimbursementStatusTone,
  sessionStatusIcon,
  sessionStatusLabel,
  sessionStatusTone,
} from '@/theme';
import type { Expense, Plan, SessionStatus } from '@/types';
import { Badge } from './Badge';
import { Chip } from './Chip';

export function SessionStatusChip({ status }: { status: SessionStatus }) {
  return (
    <Chip
      variant="status"
      tone={sessionStatusTone[status]}
      icon={sessionStatusIcon[status]}
      label={sessionStatusLabel[status]}
    />
  );
}

export function ReimbursementStatusChip({
  status,
}: {
  status: Expense['reimbursementStatus'];
}) {
  return (
    <Chip
      variant="status"
      tone={reimbursementStatusTone[status]}
      label={reimbursementStatusLabel[status]}
    />
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <Badge variant="plan" tone={planTone[plan]} label={planLabel[plan]} />;
}
