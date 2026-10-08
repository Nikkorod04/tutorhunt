import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, EmptyState, ListRow, Screen, Skeleton, Text } from '@/components/ui';
import { getExpense } from '@/services/expenses.service';
import { getSession } from '@/services/sessions.service';
import { getStudent } from '@/services/students.service';
import { getStatement, statementErrorMessage } from '@/services/statements.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { Expense, Session, Statement, Student } from '@/types';
import { formatPeso } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/date';
import { renderStatementHtml } from '@/utils/statementHtml';

export default function StatementDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[]; pdfUri?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const initialPdfUri = Array.isArray(params.pdfUri) ? params.pdfUri[0] : params.pdfUri;
  const profile = useAuthStore((state) => state.profile);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfUri, setPdfUri] = useState(initialPdfUri);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }
    try {
      const found = await getStatement(profile.uid, id);
      setStatement(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { void load(); }, [load]);

  const regeneratePdf = useCallback(async () => {
    if (!profile || !statement) return;
    setBusy(true);
    setError(null);
    try {
      const [sessionResults, expenseResults] = await Promise.all([
        Promise.all(statement.sessionIds.map((sessionId) => getSession(profile.uid, sessionId))),
        Promise.all(statement.expenseIds.map((expenseId) => getExpense(profile.uid, expenseId))),
      ]);
      const sessions = sessionResults.filter((item): item is Session => item !== null);
      const expenses = expenseResults.filter((item): item is Expense => item !== null);
      if (sessions.length !== statement.sessionIds.length || expenses.length !== statement.expenseIds.length) {
        throw new Error('Some statement items are no longer available to rebuild the PDF.');
      }

      const html = renderStatementHtml({
        statementNumber: statement.statementNumber,
        tutorName: profile.displayName,
        tutorContact: profile.email,
        studentName: student?.nickname ?? 'Student',
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        sessions,
        expenses,
        sessionSubtotal: statement.sessionSubtotal,
        expenseSubtotal: statement.expenseSubtotal,
        totalDue: statement.totalDue,
        amountPaidAtIssue: statement.amountPaidAtIssue,
        notes: statement.notes,
      });
      const pdf = await Print.printToFileAsync({ html });
      setPdfUri(pdf.uri);
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [profile, statement, student]);

  useEffect(() => {
    if (!initialPdfUri && statement && !pdfUri) void regeneratePdf();
  }, [initialPdfUri, statement, pdfUri, regeneratePdf]);

  async function previewPdf() {
    if (!pdfUri) {
      await regeneratePdf();
      return;
    }
    setBusy(true);
    try {
      await Print.printAsync({ uri: pdfUri });
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function sharePdf() {
    if (!pdfUri) {
      await regeneratePdf();
      return;
    }
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'The phone share sheet is not available on this device.');
        return;
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: statement ? `Share ${statement.statementNumber}` : 'Share statement',
        UTI: 'com.adobe.pdf',
      });
    } catch (caught) {
      setError(statementErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Screen scroll><View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}><Skeleton width="60%" height={32} /><Skeleton variant="card" /><Skeleton variant="card" /></View></Screen>;
  }

  if (!statement) {
    return <Screen scroll><EmptyState icon="alert-circle-outline" title="Statement not found" description={error ?? 'It may have been deleted, or the link is out of date.'} /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ gap: theme.space[4] }}>
          <Text token="h1">{statement.statementNumber}</Text>
          <Text token="caption" color={theme.colors.textMuted}>
            {student?.nickname ?? 'Student'} · Generated {formatDisplayDate(statement.generatedAt)}{statement.status === 'voided' ? ' · Voided' : ''}
          </Text>
        </View>

        {error ? <Card variant="flat"><Text token="caption" color={theme.colors.dangerText}>{error}</Text></Card> : null}

        {statement.status === 'voided' ? (
          <Card variant="flat">
            <View style={{ gap: theme.space[12] }}>
              <Text token="caption" color={theme.colors.textSecondary}>
                This statement was voided and replaced. It is kept for your records and cannot be reissued again.
              </Text>
              {statement.replacementStatementId ? (
                <Button
                  label="View replacement statement"
                  icon="arrow-forward-outline"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/statement-detail', params: { id: statement.replacementStatementId! } } as never)}
                  fullWidth
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        <Card variant="raised">
          <View style={{ gap: theme.space[4] }}>
            <ListRow title="Statement period" subtitle={`${formatDisplayDate(statement.periodStart)} – ${formatDisplayDate(statement.periodEnd)}`} leading={<Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />} divider />
            <ListRow title="Sessions" subtitle={`${statement.sessionIds.length} included`} leading={<Ionicons name="book-outline" size={18} color={theme.colors.textMuted} />} trailing={<Text token="caption" tabular>{formatPeso(statement.sessionSubtotal)}</Text>} divider />
            <ListRow title="Reimbursable expenses" subtitle={`${statement.expenseIds.length} included`} leading={<Ionicons name="wallet-outline" size={18} color={theme.colors.textMuted} />} trailing={<Text token="caption" tabular>{formatPeso(statement.expenseSubtotal)}</Text>} divider />
            <ListRow title="Total due" subtitle={`${formatPeso(statement.amountPaidAtIssue)} paid at issue`} leading={<Ionicons name="cash-outline" size={18} color={theme.colors.primary} />} trailing={<Text token="bodyStrong" tabular>{formatPeso(statement.totalDue)}</Text>} />
          </View>
        </Card>

        {statement.notes ? <Card variant="flat"><Text token="caption" color={theme.colors.textMuted}>{statement.notes}</Text></Card> : null}

        {pdfUri ? (
          <View style={{ gap: theme.space[12] }}>
            <Button label="Preview PDF" icon="eye-outline" variant="secondary" onPress={() => void previewPdf()} loading={busy} fullWidth />
            <Button label="Share PDF" icon="share-outline" onPress={() => void sharePdf()} loading={busy} fullWidth />
          </View>
        ) : (
          <Card variant="flat">
            <View style={{ gap: theme.space[12] }}>
              <Text token="caption" color={theme.colors.textMuted}>
                {busy ? 'Rebuilding the PDF from the saved statement data…' : 'The PDF is not currently cached. Rebuild it locally from the saved statement data.'}
              </Text>
              {!busy ? <Button label="Regenerate PDF" icon="refresh-outline" variant="secondary" onPress={() => void regeneratePdf()} fullWidth /> : null}
            </View>
          </Card>
        )}

        {statement.status === 'active' ? (
          <Button
            label="Reissue statement"
            icon="create-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/statement-new', params: { studentId: statement.studentId, reissueId: statement.id } } as never)}
            fullWidth
          />
        ) : null}
        <Button label="Generate another statement" icon="add" variant="ghost" onPress={() => router.push({ pathname: '/statement-new', params: { studentId: statement.studentId } } as never)} fullWidth />
      </View>
    </Screen>
  );
}
