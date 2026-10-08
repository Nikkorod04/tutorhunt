import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { RecordDetailHeader, RecordDetailMetrics, RecordDetailRow, RecordDetailSection } from '@/components/RecordDetail';
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
  const { showToast } = useToast();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfUri, setPdfUri] = useState(initialPdfUri);

  const load = useCallback(async () => {
    if (!profile || !id) { setLoading(false); return; }
    try {
      const found = await getStatement(profile.uid, id);
      setStatement(found);
      if (found) setStudent(await getStudent(profile.uid, found.studentId));
    } catch (caught) { setError(statementErrorMessage(caught)); }
    finally { setLoading(false); }
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
      showToast('Statement PDF regenerated');
    } catch (caught) { const message = statementErrorMessage(caught); setError(message); showToast(message, 'danger'); }
    finally { setBusy(false); }
  }, [profile, showToast, statement, student]);

  useEffect(() => {
    if (!initialPdfUri && statement && !pdfUri) void regeneratePdf();
  }, [initialPdfUri, statement, pdfUri, regeneratePdf]);

  async function previewPdf() {
    if (!pdfUri) { await regeneratePdf(); return; }
    setBusy(true);
    try { await Print.printAsync({ uri: pdfUri }); }
    catch (caught) { const message = statementErrorMessage(caught); setError(message); showToast(message, 'danger'); }
    finally { setBusy(false); }
  }

  async function sharePdf() {
    if (!pdfUri) { await regeneratePdf(); return; }
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
    } catch (caught) { const message = statementErrorMessage(caught); setError(message); showToast(message, 'danger'); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
          <Skeleton width="40%" />
          <Skeleton variant="card" height={154} />
          <Skeleton variant="card" height={210} />
        </View>
      </Screen>
    );
  }

  if (!statement) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState icon="alert-circle-outline" title="Statement not found" description={error ?? 'It may have been deleted, or the link is out of date.'} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[20] }}>
        <RecordDetailHeader
          eyebrow="STATEMENT RECORD"
          title={statement.statementNumber}
          subtitle={`${student?.nickname ?? 'Student'} · Generated ${formatDisplayDate(statement.generatedAt)}`}
          icon="document-text-outline"
          status={<Badge label={statement.status === 'active' ? 'Active' : 'Voided'} tone={statement.status === 'active' ? 'success' : 'neutral'} />}
          onBack={() => router.back()}
        />

        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        {statement.status === 'voided' ? (
          <Card variant="accent">
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[4] }}>
                <Text token="h3">This statement was voided</Text>
                <Text token="caption" color={theme.colors.warningText}>It was replaced and is kept for your records.</Text>
              </View>
              {statement.replacementStatementId ? <Button label="View replacement statement" icon="arrow-forward-outline" variant="secondary" onPress={() => router.push({ pathname: '/statement-detail', params: { id: statement.replacementStatementId! } } as never)} fullWidth /> : null}
            </View>
          </Card>
        ) : null}

        <Card variant="raised" style={{ backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primaryBorder }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="micro" color={theme.colors.primary}>TOTAL DUE</Text>
            <Text token="display" tabular>{formatPeso(statement.totalDue)}</Text>
            <Text token="caption" color={theme.colors.textSecondary}>Generated for the selected statement period.</Text>
          </View>
        </Card>

        <RecordDetailMetrics
          metrics={[
            { label: 'SESSION SUBTOTAL', value: formatPeso(statement.sessionSubtotal) },
            { label: 'EXPENSE SUBTOTAL', value: formatPeso(statement.expenseSubtotal), tone: 'info' },
          ]}
        />

        <RecordDetailSection title="STATEMENT DETAILS">
          <Card variant="flat" padded={false}>
            <RecordDetailRow icon="calendar-outline" label="STATEMENT PERIOD" value={`${formatDisplayDate(statement.periodStart)} – ${formatDisplayDate(statement.periodEnd)}`} tone="info" divider />
            <RecordDetailRow icon="book-outline" label="SESSIONS" value={`${statement.sessionIds.length} included`} tone="neutral" divider />
            <RecordDetailRow icon="wallet-outline" label="REIMBURSABLE EXPENSES" value={`${statement.expenseIds.length} included`} tone="info" />
          </Card>
        </RecordDetailSection>

        {statement.notes ? (
          <RecordDetailSection title="NOTES">
            <Card variant="flat"><Text token="body">{statement.notes}</Text></Card>
          </RecordDetailSection>
        ) : null}

        <RecordDetailSection title="PDF STATEMENT">
          {pdfUri ? (
            <Card variant="premium">
              <View style={{ gap: theme.space[12] }}>
                <View style={{ gap: theme.space[4] }}>
                  <Text token="h3">Your PDF is ready</Text>
                  <Text token="caption" color={theme.colors.textMuted}>Preview it or share it with the parent from this device.</Text>
                </View>
                <Button label="Preview PDF" icon="eye-outline" variant="secondary" onPress={() => void previewPdf()} loading={busy} fullWidth />
                <Button label="Share PDF" icon="share-outline" onPress={() => void sharePdf()} loading={busy} fullWidth />
              </View>
            </Card>
          ) : (
            <Card variant="flat">
              <View style={{ gap: theme.space[12] }}>
                <Text token="caption" color={theme.colors.textMuted}>{busy ? 'Rebuilding the PDF from the saved statement data…' : 'The PDF is not currently cached. Rebuild it locally from the saved statement data.'}</Text>
                {!busy ? <Button label="Regenerate PDF" icon="refresh-outline" variant="secondary" onPress={() => void regeneratePdf()} fullWidth /> : null}
              </View>
            </Card>
          )}
        </RecordDetailSection>

        <Card variant="flat">
          <View style={{ gap: theme.space[12] }}>
            <Text token="h3">Statement actions</Text>
            {statement.status === 'active' ? <Button label="Reissue statement" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/statement-new', params: { studentId: statement.studentId, reissueId: statement.id } } as never)} fullWidth /> : null}
            <Button label="Generate another statement" icon="add" variant="ghost" onPress={() => router.push({ pathname: '/statement-new', params: { studentId: statement.studentId } } as never)} fullWidth />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
