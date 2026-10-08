import type { Expense, Session } from '@/types';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate, formatDisplayTime } from '@/utils/date';
import { expenseTotal } from '@/utils/pricing';

export interface StatementHtmlInput {
  statementNumber: string;
  tutorName: string;
  tutorContact: string;
  studentName: string;
  periodStart: Date;
  periodEnd: Date;
  sessions: Session[];
  expenses: Expense[];
  sessionSubtotal: number;
  expenseSubtotal: number;
  totalDue: number;
  amountPaidAtIssue: number;
  notes: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function formatTopicCategory(category: Session['topicCategory']): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sessionRows(sessions: Session[]): string {
  if (sessions.length === 0) {
    return '<tr><td colspan="4" class="empty">No billable sessions selected.</td></tr>';
  }
  return sessions.map((session) => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(session.startsAt))}<br><span class="muted">${escapeHtml(formatDisplayTime(session.startsAt))}</span></td>
      <td><strong>${escapeHtml(formatTopicCategory(session.topicCategory))}</strong><br><span class="muted">${escapeHtml(session.subject)}</span></td>
      <td>${escapeHtml(formatDuration(session.durationMinutes))}</td>
      <td class="money">${formatPeso(session.sessionFee)}</td>
    </tr>
  `).join('');
}

function expenseRows(expenses: Expense[]): string {
  if (expenses.length === 0) {
    return '<tr><td colspan="3" class="empty">No reimbursable expenses selected.</td></tr>';
  }
  return expenses.map((expense) => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(expense.expenseDates[0] ?? expense.createdAt))}</td>
      <td>${escapeHtml(expense.title)}</td>
      <td class="money">${formatPeso(expenseTotal(expense))}</td>
    </tr>
  `).join('');
}

export function renderStatementHtml(input: StatementHtmlInput): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { margin: 36px; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0F172A; font-size: 12px; line-height: 1.45; }
      .brand { color: #4F46E5; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
      h1 { margin: 4px 0 0; font-size: 26px; }
      h2 { margin: 26px 0 8px; font-size: 13px; color: #334155; letter-spacing: .6px; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; gap: 32px; border-bottom: 1px solid #E2E8F0; padding-bottom: 20px; }
      .meta { text-align: right; color: #475569; }
      .meta strong { display: block; color: #0F172A; font-size: 13px; }
      .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; margin-top: 18px; }
      .label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
      .value { font-size: 13px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; }
      th { padding: 8px 6px; border-bottom: 1px solid #CBD5E1; color: #64748B; font-size: 10px; text-align: left; text-transform: uppercase; }
      td { padding: 9px 6px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
      .money { text-align: right; white-space: nowrap; }
      .muted { color: #64748B; font-size: 10px; }
      .empty { color: #64748B; text-align: center; padding: 14px; }
      .subtotal { display: flex; justify-content: flex-end; gap: 24px; padding: 10px 6px; color: #475569; }
      .total { display: flex; justify-content: flex-end; gap: 24px; margin-top: 12px; padding: 14px; background: #EEF2FF; border-radius: 8px; font-size: 16px; font-weight: 700; }
      .notes { margin-top: 20px; padding: 12px 14px; background: #F8FAFC; border-radius: 8px; white-space: pre-wrap; }
      .footer { margin-top: 30px; color: #94A3B8; font-size: 10px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div><div class="brand">Tutor Hunt</div><h1>Tutoring Statement</h1></div>
      <div class="meta"><strong>${escapeHtml(input.statementNumber)}</strong>Generated ${escapeHtml(formatDisplayDate(new Date()))}</div>
    </div>
    <div class="details">
      <div><div class="label">Tutor</div><div class="value">${escapeHtml(input.tutorName || 'Tutor')}</div><div class="muted">${escapeHtml(input.tutorContact)}</div></div>
      <div><div class="label">Student</div><div class="value">${escapeHtml(input.studentName)}</div></div>
      <div><div class="label">Statement period</div><div class="value">${escapeHtml(formatDisplayDate(input.periodStart))} – ${escapeHtml(formatDisplayDate(input.periodEnd))}</div></div>
    </div>
    <h2>Sessions</h2>
    <table><thead><tr><th>Date</th><th>Topic</th><th>Duration</th><th class="money">Fee</th></tr></thead><tbody>${sessionRows(input.sessions)}</tbody></table>
    <div class="subtotal"><span>Session subtotal</span><strong>${formatPeso(input.sessionSubtotal)}</strong></div>
    <h2>Reimbursable expenses</h2>
    <table><thead><tr><th>Date</th><th>Expense</th><th class="money">Amount</th></tr></thead><tbody>${expenseRows(input.expenses)}</tbody></table>
    <div class="subtotal"><span>Expense subtotal</span><strong>${formatPeso(input.expenseSubtotal)}</strong></div>
    <div class="total"><span>Total amount due</span><span>${formatPeso(input.totalDue)}</span></div>
    ${input.notes.trim() ? `<div class="notes"><strong>Notes</strong><br>${escapeHtml(input.notes.trim())}</div>` : ''}
    <div class="footer">Generated by Tutor Hunt · ${escapeHtml(input.tutorContact)}</div>
  </body>
</html>`;
}
