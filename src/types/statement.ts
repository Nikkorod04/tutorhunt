/** Statement metadata. The generated PDF stays local and is never uploaded. */

export type StatementStatus = 'active' | 'voided';

export interface Statement {
  id: string;
  studentId: string;
  statementNumber: string;
  status: StatementStatus;
  reissueOfStatementId: string | null;
  replacementStatementId: string | null;
  voidedAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
  sessionIds: string[];
  expenseIds: string[];
  sessionSubtotal: number;
  expenseSubtotal: number;
  totalDue: number;
  amountPaidAtIssue: number;
  notes: string;
  generatedAt: Date;
}
