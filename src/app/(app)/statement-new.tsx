import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  TextField,
  useToast,
} from '@/components/ui';
import { FormHeader } from '@/components/FormHeader';
import { ensureEntitlement } from '@/services/entitlements.service';
import {
  calculateStatementTotals,
  generateStatement,
  getStatementCandidates,
  getStatementReissueCandidates,
  getStatement,
  nextStatementNumber,
  reissueStatement,
  statementErrorMessage,
  statementQuotaState,
  type StatementCandidates,
} from '@/services/statements.service';
import { listStudents } from '@/services/students.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Statement, Student } from '@/types';
import { expenseTotal, sessionCharge } from '@/utils/pricing';
import { formatPesoCompact } from '@/utils/currency';
import { formatDisplayDate, manilaParts, parseIsoDate } from '@/utils/date';
import { renderStatementHtml } from '@/utils/statementHtml';

function monthStart(date: Date): Date {
  const parts = manilaParts(date);
  return parseIsoDate(`${parts.year}-${String(parts.month + 1).padStart(2, '0')}-01`) ?? date;
}

function monthEnd(date: Date): Date {
  const parts = manilaParts(date);
  const lastDay = new Date(Date.UTC(parts.year, parts.month + 1, 0)).getUTCDate();
  return parseIsoDate(`${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`) ?? date;
}

function SelectableRow({
  selected,
  title,
  subtitle,
  amount,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  amount: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[12],
        paddingVertical: theme.space[12],
        paddingHorizontal: theme.space[12],
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? theme.colors.surfaceSunken : selected ? theme.colors.primarySubtle : theme.colors.surface,
        borderWidth: 0.5,
        borderColor: selected ? theme.colors.primaryBorder : theme.colors.borderSubtle,
      })}
    >
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={22}
        color={selected ? theme.colors.primary : theme.colors.textHint}
      />
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <Text token="bodyStrong" numberOfLines={1}>{title}</Text>
        <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text token="caption" tabular>{formatPesoCompact(amount)}</Text>
    </Pressable>
  );
}

export default function StatementNewScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ studentId?: string | string[]; reissueId?: string | string[] }>();
  const preferredStudentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const reissueId = Array.isArray(params.reissueId) ? params.reissueId[0] : params.reissueId;
  const profile = useAuthStore((state) => state.profile);
  const cachedEntitlement = useAuthStore((state) => state.entitlement);
  const setEntitlement = useAuthStore((state) => state.setEntitlement);
  const { showToast } = useToast();
  const [entitlement, setLocalEntitlement] = useState(cachedEntitlement);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState(preferredStudentId ?? '');
  const [reissueSource, setReissueSource] = useState<Statement | null>(null);
  const [loadingReissue, setLoadingReissue] = useState(Boolean(reissueId));
  const [periodStart, setPeriodStart] = useState<Date | null>(() => monthStart(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date | null>(() => monthEnd(new Date()));
  const [candidates, setCandidates] = useState<StatementCandidates | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedEntitlement) {
      setLocalEntitlement(cachedEntitlement);
      return;
    }
    if (!profile) return;
    void ensureEntitlement(profile.uid)
      .then((fresh) => {
        setLocalEntitlement(fresh);
        setEntitlement(fresh);
      })
      .catch((caught) => setError(statementErrorMessage(caught)));
  }, [cachedEntitlement, profile, setEntitlement]);

  useEffect(() => {
    if (!profile) return;
    void listStudents(profile.uid, { pageSize: 100 })
      .then((page) => {
        setStudents(page.items);
        if (page.items[0]) setStudentId((current) => current || page.items[0].id);
      })
      .catch((caught) => setError(statementErrorMessage(caught)))
      .finally(() => setLoadingStudents(false));
  }, [profile]);

  useEffect(() => {
    if (!profile || !reissueId) return;
    setLoadingReissue(true);
    void getStatement(profile.uid, reissueId)
      .then((found) => {
        if (!found) throw new Error('The original statement could not be found.');
        if (found.status === 'voided' || found.replacementStatementId) {
          throw new Error('This statement has already been voided or reissued.');
        }
        setReissueSource(found);
        setStudentId(found.studentId);
        setPeriodStart(found.periodStart);
        setPeriodEnd(found.periodEnd);
        setNotes(found.notes);
      })
      .catch((caught) => setError(statementErrorMessage(caught)))
      .finally(() => setLoadingReissue(false));
  }, [profile, reissueId]);

  const loadCandidates = useCallback(async () => {
    if (reissueId && !reissueSource) {
      setCandidates(null);
      return;
    }
    if (!profile || !studentId || !periodStart || !periodEnd) {
      setCandidates(null);
      return;
    }
    if (periodStart.getTime() > periodEnd.getTime()) {
      setCandidates(null);
      setError('The start date must be before the end date.');
      return;
    }

    setLoadingCandidates(true);
    setError(null);
    try {
      const next = reissueSource
        ? await getStatementReissueCandidates(profile.uid, reissueSource.id, periodStart, periodEnd)
        : await getStatementCandidates(profile.uid, studentId, periodStart, periodEnd);
      setCandidates(next);
      setSelectedSessionIds(
        reissueSource
          ? reissueSource.sessionIds.filter((id) => next.sessions.some((session) => session.id === id))
          : next.sessions.map((session) => session.id),
      );
      setSelectedExpenseIds(
        reissueSource
          ? reissueSource.expenseIds.filter((id) => next.expenses.some((expense) => expense.id === id))
          : next.expenses.map((expense) => expense.id),
      );
    } catch (caught) {
      setError(statementErrorMessage(caught));
      setCandidates(null);
    } finally {
      setLoadingCandidates(false);
    }
  }, [profile, studentId, periodStart, periodEnd, reissueId, reissueSource]);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);

  const selectedSessions = useMemo(
    () => candidates?.sessions.filter((session) => selectedSessionIds.includes(session.id)) ?? [],
    [candidates, selectedSessionIds],
  );
  const selectedExpenses = useMemo(
    () => candidates?.expenses.filter((expense) => selectedExpenseIds.includes(expense.id)) ?? [],
    [candidates, selectedExpenseIds],
  );
  const totals = calculateStatementTotals(
    selectedSessions,
    selectedExpenses,
    candidates?.amountPaidAtIssue ?? 0,
  );
  const quota = entitlement ? statementQuotaState(entitlement) : null;
  const selectedStudent = students.find((student) => student.id === studentId);

  function toggleId(ids: string[], id: string, setter: (next: string[]) => void) {
    setter(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async function handleGenerate() {
    if (!profile || !candidates || !selectedStudent || !periodStart || !periodEnd) return;
    if (!reissueSource && !entitlement) return;
    if (!reissueSource && quota?.exhausted) {
      setError('You have reached the free plan statement limit for this month.');
      return;
    }
    if (selectedSessions.length === 0 && selectedExpenses.length === 0) {
      setError('Select at least one session or expense for the statement.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const generatedAt = new Date();
      const statementNumber = await nextStatementNumber(profile.uid, generatedAt);
      const html = renderStatementHtml({
        statementNumber,
        tutorName: profile.displayName,
        tutorContact: profile.email,
        studentName: selectedStudent.nickname,
        periodStart,
        periodEnd,
        sessions: selectedSessions,
        expenses: selectedExpenses,
        sessionSubtotal: totals.sessionSubtotal,
        expenseSubtotal: totals.expenseSubtotal,
        totalDue: totals.totalDue,
        amountPaidAtIssue: candidates.amountPaidAtIssue,
        notes,
      });
      const pdf = await Print.printToFileAsync({ html });
      const input = {
        studentId,
        periodStart,
        periodEnd,
        sessionIds: selectedSessions.map((session) => session.id),
        expenseIds: selectedExpenses.map((expense) => expense.id),
        sessionSubtotal: totals.sessionSubtotal,
        expenseSubtotal: totals.expenseSubtotal,
        totalDue: totals.totalDue,
        amountPaidAtIssue: candidates.amountPaidAtIssue,
        notes,
      };
      const result = reissueSource
        ? { statement: await reissueStatement(profile.uid, reissueSource.id, input, statementNumber, generatedAt) }
        : await generateStatement(profile.uid, input, entitlement!, statementNumber, generatedAt);
      if (!reissueSource && 'entitlement' in result) {
        setLocalEntitlement(result.entitlement);
        setEntitlement(result.entitlement);
      }
      showToast(reissueSource ? 'Statement reissued successfully' : 'Statement generated successfully');
      router.replace({ pathname: '/statement-detail', params: { id: result.statement.id, pdfUri: pdf.uri } } as never);
    } catch (caught) {
      const message = statementErrorMessage(caught);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (loadingStudents) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="60%" height={30} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  if (students.length === 0) {
    return <Screen scroll><EmptyState icon="people-outline" title="Add a student first" description="Statements need a student before sessions and expenses can be selected." /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <FormHeader
          eyebrow="PARENT STATEMENT"
          title={reissueSource ? 'Reissue statement' : 'Generate statement'}
          description={reissueSource ? `Correct ${reissueSource.statementNumber} before creating its replacement.` : 'Choose the sessions and reimbursable expenses to include.'}
          icon="document-text-outline"
        />

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        {reissueSource ? (
          <Card variant="flat">
            <Text token="caption" color={theme.colors.textSecondary}>
              The original statement stays unchanged until the replacement PDF is generated. Unpaid expenses you remove will become available again.
            </Text>
          </Card>
        ) : null}

        <Card variant="raised">
          <SectionHeader title="Statement details" />
          <View style={{ gap: theme.space[16] }}>
            <View style={{ gap: theme.space[8] }}>
              <Text token="caption" color={theme.colors.textSecondary}>Student</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                {students.map((student) => <Chip key={student.id} label={student.nickname} selected={student.id === studentId} onPress={reissueSource ? undefined : () => setStudentId(student.id)} />)}
              </View>
            </View>
            <DateField label="Period starts" value={periodStart} onChange={setPeriodStart} />
            <DateField label="Period ends" value={periodEnd} onChange={setPeriodEnd} />
            <TextField label="Note (optional)" value={notes} onChangeText={setNotes} placeholder="Thank you for your continued support." multiline maxLength={1000} showCounter />
          </View>
        </Card>

        <Card variant="flat">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
            <Text token="caption" color={theme.colors.textSecondary}>
              {reissueSource
                ? 'Reissue · does not use another PDF allowance'
                : quota?.limit === Number.POSITIVE_INFINITY
                  ? 'Pro plan · Unlimited statements'
                  : `${quota?.used ?? 0} of ${quota?.limit ?? 0} statements used this month`}
            </Text>
          </View>
        </Card>

        {!reissueSource && quota?.exhausted ? (
          <Card variant="premium">
            <View style={{ gap: theme.space[8] }}>
              <Text token="h3">Free statement limit reached</Text>
              <Text token="caption" color={theme.colors.textMuted}>
                Upgrade to Pro for unlimited PDF statements. Your existing records are kept.
              </Text>
              <Button label="View Pro plans" variant="accent" onPress={() => router.push('/upgrade' as never)} />
            </View>
          </Card>
        ) : null}

        {loadingReissue || loadingCandidates ? <Skeleton variant="list" rows={3} /> : null}

        {!loadingCandidates && candidates ? (
          <>
            <View>
              <SectionHeader title={`Sessions (${selectedSessions.length}/${candidates.sessions.length})`} />
              <View style={{ gap: theme.space[8] }}>
                {candidates.sessions.length > 0 ? candidates.sessions.map((session) => (
                  <SelectableRow
                    key={session.id}
                    selected={selectedSessionIds.includes(session.id)}
                    title={session.subject}
                    subtitle={`${formatDisplayDate(session.startsAt)} · ${session.durationMinutes} min`}
                    amount={sessionCharge(session)}
                    onPress={() => toggleId(selectedSessionIds, session.id, setSelectedSessionIds)}
                  />
                )) : <Card variant="flat"><Text token="caption" color={theme.colors.textMuted}>No billable sessions in this period.</Text></Card>}
              </View>
            </View>

            <View>
              <SectionHeader title={`Reimbursable expenses (${selectedExpenses.length}/${candidates.expenses.length})`} />
              <View style={{ gap: theme.space[8] }}>
                {candidates.expenses.length > 0 ? candidates.expenses.map((expense) => (
                  <SelectableRow
                    key={expense.id}
                    selected={selectedExpenseIds.includes(expense.id)}
                    title={expense.title}
                    subtitle={`${expense.expenseDates.length} occurrence${expense.expenseDates.length === 1 ? '' : 's'}`}
                    amount={expenseTotal(expense)}
                    onPress={() => toggleId(selectedExpenseIds, expense.id, setSelectedExpenseIds)}
                  />
                )) : <Card variant="flat"><Text token="caption" color={theme.colors.textMuted}>No new reimbursable expenses in this period.</Text></Card>}
              </View>
            </View>

            <Card variant="raised">
              <SectionHeader title="Statement total" />
              <View style={{ gap: theme.space[8] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text token="caption" color={theme.colors.textMuted}>Sessions</Text><Text token="caption" tabular>{formatPesoCompact(totals.sessionSubtotal)}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text token="caption" color={theme.colors.textMuted}>Expenses</Text><Text token="caption" tabular>{formatPesoCompact(totals.expenseSubtotal)}</Text></View>
                <View style={{ height: 0.5, backgroundColor: theme.colors.borderSubtle }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text token="bodyStrong">Total due</Text><Text token="h2" tabular>{formatPesoCompact(totals.totalDue)}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text token="caption" color={theme.colors.textMuted}>Paid before issue</Text><Text token="caption" tabular>{formatPesoCompact(candidates.amountPaidAtIssue)}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text token="caption" color={totals.remainingBalance < 0 ? theme.colors.successText : theme.colors.textSecondary}>Remaining balance</Text><Text token="bodyStrong" tabular color={totals.remainingBalance < 0 ? theme.colors.successText : theme.colors.textPrimary}>{formatPesoCompact(totals.remainingBalance)}</Text></View>
              </View>
            </Card>
          </>
        ) : null}

        <Button
          label={reissueSource ? 'Reissue PDF statement' : 'Generate PDF statement'}
          icon="document-text-outline"
          onPress={() => void handleGenerate()}
          loading={busy}
          disabled={!candidates || (!reissueSource && (!entitlement || quota?.exhausted === true))}
          fullWidth
        />
      </View>
    </Screen>
  );
}
