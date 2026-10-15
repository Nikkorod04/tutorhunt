/**
 * Student information and quick actions.
 *
 * The screen follows the native Android-style student mockup: a compact app
 * bar, profile hero, contact/tutoring/notes cards, and a single overflow menu
 * for the record actions.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  SessionStatusChip,
  Skeleton,
  Text,
  TopAppBar,
  useToast,
  type IconName,
} from '@/components/ui';
import { activePlanFor } from '@/constants/plans';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import {
  archiveStudent,
  deleteStudent,
  getStudent,
  restoreStudent,
  setStudentInactive,
  studentErrorMessage,
  StudentLimitError,
} from '@/services/students.service';
import { listSessions } from '@/services/sessions.service';
import { useAuthStore } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useTheme, type Tone } from '@/theme';
import type { Session, Student, StudentStatus } from '@/types';
import { ageFromBirthday, formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from '@/utils/date';
import { formatPeso, formatPesoCompact } from '@/utils/currency';
import { runAfterNavigation, showToastAfterNavigation } from '@/utils/feedback';
import { compareSessionsForDisplay, formatSessionTimingHeading, getSessionTiming } from '@/utils/session-presentation';

const STATUS_TONE: Record<StudentStatus, Tone> = {
  active: 'success',
  inactive: 'neutral',
  archived: 'warning',
};

const STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

type ClipboardModule = {
  setStringAsync: (value: string) => Promise<void>;
};

// Older development/production binaries may not contain ExpoClipboard yet.
let clipboard: ClipboardModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clipboard = require('expo-clipboard') as ClipboardModule;
} catch {
  clipboard = null;
}

function InfoCard({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <Card variant="raised">
      <View style={{ gap: theme.space[12] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.primarySubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={18} color={theme.colors.primary} />
          </View>
          <Text token="h3">{title}</Text>
        </View>
        {children}
      </View>
    </Card>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
      <Text token="caption" color={theme.colors.textMuted} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text token="bodyStrong" align="right" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

function avatarProps(student: Student) {
  return {
    builtin: student.avatarType === 'custom' ? undefined : student.avatarType,
    imageUrl: student.avatarType === 'custom' ? student.customAvatarUrl : null,
    name: student.nickname,
  } as const;
}

function typicalSchedule(session: Session | undefined): string {
  if (!session) return 'Not set';
  return `${formatDisplayTime(session.startsAt)} – ${formatDisplayTime(session.endsAt)}`;
}

export default function StudentDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const upsert = useStudentStore((state) => state.upsert);
  const remove = useStudentStore((state) => state.remove);
  const { showToast } = useToast();
  const { beginSubmit, endSubmit } = useSubmitGuard();

  const [student, setStudent] = useState<Student | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<'archive' | 'delete' | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }
    try {
      const [found, sessions] = await Promise.all([
        getStudent(profile.uid, id),
        listSessions(profile.uid, { studentId: id, pageSize: 3 }),
      ]);
      setError(null);
      setStudent(found);
        setRecentSessions([...sessions.items].sort((left, right) => compareSessionsForDisplay(left, right)).slice(0, 3));
    } catch {
      setStudent(null);
      setError('Could not load this student. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function mutate(action: 'archive' | 'restore' | 'inactive') {
    if (!profile || !id || !student || !beginSubmit()) return;

    setBusy(true);
    try {
      if (action === 'archive') await archiveStudent(profile.uid, id);
      if (action === 'restore') await restoreStudent(profile.uid, id, activePlanFor(entitlement));
      if (action === 'inactive') await setStudentInactive(profile.uid, id);

      const nextStatus: StudentStatus = action === 'archive' ? 'archived' : action === 'restore' ? 'active' : 'inactive';
      const updated: Student = { ...student, status: nextStatus, updatedAt: new Date() };
      setStudent(updated);
      upsert(updated);
      showToast(nextStatus === 'archived' ? 'Student archived' : nextStatus === 'active' ? 'Student restored' : 'Student marked inactive');
    } catch (caught) {
      const message = studentErrorMessage(caught);
      showToast(message, caught instanceof StudentLimitError ? 'warning' : 'danger');
    } finally {
      endSubmit();
      setBusy(false);
    }
  }

  function confirmArchive() {
    setConfirmation('archive');
  }

  function confirmPermanentDelete() {
    setConfirmation('delete');
  }

  async function deletePermanently() {
    if (!profile || !id || !student || !beginSubmit()) return;
    setBusy(true);
    let leavingScreen = false;
    try {
      await deleteStudent(profile.uid, id);
      leavingScreen = true;
      router.back();
      runAfterNavigation(() => remove(id));
      showToastAfterNavigation(showToast, 'Student deleted permanently');
    } catch (caught) {
      showToast(studentErrorMessage(caught), 'danger');
    } finally {
      endSubmit();
      if (!leavingScreen) setBusy(false);
    }
  }

  async function copyParentContact() {
    if (!student?.parentContact.trim()) return;
    if (!clipboard) {
      showToast('Copy is unavailable in this app build. Rebuild the app to enable it.', 'warning');
      return;
    }
    await clipboard.setStringAsync(student.parentContact.trim());
    showToast('Parent contact copied');
  }

  async function callParent() {
    if (!student?.parentContact.trim()) return;
    const phone = student.parentContact.trim().replace(/[\s()-]/g, '');
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      showToast('Could not open the phone app', 'danger');
    }
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}>
          <Skeleton width="32%" />
          <Skeleton variant="card" height={144} />
          <Skeleton variant="card" height={116} />
          <Skeleton variant="card" height={188} />
        </View>
      </Screen>
    );
  }

  if (!student) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[32] }}>
          <EmptyState
            icon="alert-circle-outline"
            title="Student not found"
            description={error ?? 'It may have been removed, or the link is out of date.'}
            action={<Button label="Try again" icon="refresh-outline" variant="secondary" onPress={() => void load()} />}
          />
        </View>
      </Screen>
    );
  }

  const latestSession = recentSessions[0];
  const avatar = avatarProps(student);

  return (
    <Screen
      scroll
      header={(
        <View style={{ position: 'relative', zIndex: 20, overflow: 'visible' }}>
          <TopAppBar
            title="Student info"
            onBack={() => router.back()}
            action={(
              <IconButton
                icon={actionsOpen ? 'close-outline' : 'ellipsis-vertical'}
                accessibilityLabel={actionsOpen ? 'Close student actions' : 'Open student actions'}
                onPress={() => setActionsOpen((open) => !open)}
                color={theme.colors.textOnPrimary}
                pressedBackgroundColor={theme.colors.primaryPressed}
              />
            )}
          />

          {actionsOpen ? (
            <View
              style={{
                position: 'absolute',
                top: '100%',
                right: theme.layout.screenPadding,
                width: '82%',
                maxWidth: 320,
                zIndex: 3,
                elevation: 8,
              }}
            >
              <Card
                variant="raised"
                style={{
                  paddingVertical: theme.space[4],
                  borderColor: theme.colors.borderDefault,
                  shadowColor: theme.colors.shadowBase,
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                }}
              >
                <ListRow title="Add session" leading={<Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />} onPress={() => { setActionsOpen(false); router.push(`/session-new?studentId=${student.id}` as never); }} />
                <ListRow title="Add expense" leading={<Ionicons name="wallet-outline" size={20} color={theme.colors.textSecondary} />} onPress={() => { setActionsOpen(false); router.push({ pathname: '/expense-new', params: { studentId: student.id } } as never); }} />
                <ListRow title="Record payment" leading={<Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} />} onPress={() => { setActionsOpen(false); router.push({ pathname: '/payment-new', params: { studentId: student.id } } as never); }} />
                <ListRow title="Create statement" leading={<Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />} onPress={() => { setActionsOpen(false); router.push({ pathname: '/statement-new', params: { studentId: student.id } } as never); }} />
                <ListRow title="Edit student" leading={<Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />} onPress={() => { setActionsOpen(false); router.push(`/student-edit?id=${student.id}` as never); }} />
              </Card>
            </View>
          ) : null}
        </View>
      )}
    >
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        <Card
          variant="raised"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primaryBorder,
          }}
        >
          <View style={{ gap: theme.space[16] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[16] }}>
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primaryBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar {...avatar} size="lg" />
              </View>
              <View style={{ flex: 1, gap: theme.space[8] }}>
                <Text token="h1" numberOfLines={2}>{student.nickname}</Text>
                <Chip variant="status" tone={STATUS_TONE[student.status]} label={STATUS_LABEL[student.status]} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View
                style={{
                  flex: 1,
                  minHeight: 58,
                  padding: theme.space[8],
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 0.5,
                  borderColor: theme.colors.borderDefault,
                  gap: theme.space[2],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
                  <Ionicons name="school-outline" size={15} color={theme.colors.primary} />
                  <Text token="micro" color={theme.colors.textMuted}>GRADE LEVEL</Text>
                </View>
                <Text token="bodyStrong" numberOfLines={1}>{student.gradeLevel || 'Not set'}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minHeight: 58,
                  padding: theme.space[8],
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 0.5,
                  borderColor: theme.colors.borderDefault,
                  gap: theme.space[2],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
                  <Ionicons name="calendar-outline" size={15} color={theme.colors.info} />
                  <Text token="micro" color={theme.colors.textMuted}>AGE</Text>
                </View>
                <Text token="bodyStrong">{student.birthday ? `${ageFromBirthday(student.birthday)} years old` : 'Not set'}</Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space[8],
                padding: theme.space[12],
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
                borderWidth: 0.5,
                borderColor: theme.colors.borderDefault,
              }}
            >
              <Ionicons name="business-outline" size={20} color={theme.colors.warning} />
              <View style={{ flex: 1, gap: theme.space[2] }}>
                <Text token="micro" color={theme.colors.textMuted}>SCHOOL</Text>
                <Text token="bodyStrong" numberOfLines={2}>{student.school || 'School not set'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {latestSession?.subject ? <Chip variant="status" tone="info" label={latestSession.subject} /> : null}
              <Chip variant="status" tone="neutral" label={`${formatPeso(student.defaultRate)}${student.rateType === 'hourly' ? '/hr' : '/session'}`} />
            </View>
          </View>
        </Card>

        <InfoCard icon="people-outline" title="Parent contact">
          <View style={{ gap: theme.space[2] }}>
            <Text token="bodyStrong">{student.parentGuardianName || 'Parent or guardian not set'}</Text>
            <Text token="body" color={theme.colors.textSecondary}>{student.parentContact || 'No contact details added'}</Text>
          </View>
          {student.parentContact ? (
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View style={{ flex: 1 }}><Button label="Call" icon="call-outline" variant="secondary" onPress={() => void callParent()} fullWidth /></View>
              <View style={{ flex: 1 }}><Button label="Copy" icon="copy-outline" variant="secondary" onPress={() => void copyParentContact()} fullWidth /></View>
            </View>
          ) : null}
        </InfoCard>

        <InfoCard icon="school-outline" title="Tutoring information">
          <View style={{ gap: theme.space[12] }}>
            <DetailLine label="Subject" value={latestSession?.subject ?? 'Not set'} />
            <DetailLine label={student.rateType === 'hourly' ? 'Hourly rate' : 'Session rate'} value={`${formatPeso(student.defaultRate)}${student.rateType === 'hourly' ? '/hr' : ''}`} />
            <DetailLine label="Start date" value={formatDisplayDate(student.createdAt)} />
            <DetailLine label="Typical schedule" value={typicalSchedule(latestSession)} />
            <DetailLine label="Tutoring place" value={student.tutoringPlace || 'Not set'} />
          </View>
        </InfoCard>

        <InfoCard icon="document-text-outline" title="Notes">
          <Text token="body" color={student.notes ? theme.colors.textSecondary : theme.colors.textMuted}>
            {student.notes || 'No notes added yet.'}
          </Text>
        </InfoCard>

        <View style={{ gap: theme.space[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text token="h3">Recent sessions</Text>
            <Button label="View all" size="sm" variant="ghost" onPress={() => router.push(`/sessions?studentId=${student.id}` as never)} />
          </View>
          {recentSessions.length > 0 ? (
            <Card variant="flat" padded={false}>
              {recentSessions.map((session, index) => (
                <ListRow
                  key={session.id}
                  title={formatSessionTimingHeading(getSessionTiming(session, now), student.tutoringPlace)}
                  subtitle={`${session.subject} · ${formatDisplayDateTime(session.startsAt)} · ${formatDisplayTime(session.endsAt)}`}
                  leading={<Ionicons name={getSessionTiming(session, now).kind === 'overdue' ? 'alert-circle-outline' : 'book-outline'} size={18} color={getSessionTiming(session, now).kind === 'overdue' ? theme.colors.danger : theme.colors.primary} />}
                  trailing={<View style={{ alignItems: 'flex-end', gap: theme.space[4] }}><Text token="caption" tabular>{formatPesoCompact(session.sessionFee)}</Text><SessionStatusChip status={session.status} /></View>}
                  divider={index < recentSessions.length - 1}
                  showChevron
                  onPress={() => router.push(`/session-detail?id=${session.id}` as never)}
                />
              ))}
            </Card>
          ) : (
            <Card variant="flat"><Text token="caption" color={theme.colors.textMuted}>No sessions recorded for this student.</Text></Card>
          )}
        </View>

        <Card variant="raised">
          <View style={{ gap: theme.space[12] }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">Manage student</Text>
              <Text token="caption" color={theme.colors.textMuted}>Update the profile or change the student’s record status.</Text>
            </View>

            <View style={{ gap: theme.space[8], alignSelf: 'stretch', alignItems: 'stretch' }}>
              <View style={{ alignSelf: 'stretch', alignItems: 'stretch' }}>
                <Button label="Edit student" icon="create-outline" variant="primary" onPress={() => router.push(`/student-edit?id=${student.id}` as never)} fullWidth />
              </View>
              {student.status === 'archived' ? (
                <View style={{ alignSelf: 'stretch', alignItems: 'stretch' }}>
                  <Button label="Restore student" icon="refresh-outline" variant="secondary" loading={busy} onPress={() => void mutate('restore')} fullWidth />
                </View>
              ) : null}
            </View>

            <View style={{ height: 0.5, backgroundColor: theme.colors.borderSubtle, marginVertical: theme.space[4] }} />

            <View style={{ gap: theme.space[8] }}>
              <Text token="micro" color={theme.colors.dangerText}>DANGER ZONE</Text>
              <View style={{ padding: theme.space[12], borderRadius: theme.radius.md, backgroundColor: theme.colors.dangerSubtle, borderWidth: 0.5, borderColor: theme.colors.dangerBorder, gap: theme.space[8] }}>
                <Text token="caption" color={theme.colors.dangerText}>Permanent deletion cannot be undone. Existing sessions, expenses, payments and statements will be kept.</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
                  <View style={{ flex: 1 }}>
                    <Button label="Delete student permanently" icon="trash-outline" variant="destructive" loading={busy} onPress={confirmPermanentDelete} fullWidth />
                  </View>
                  {student.status !== 'archived' ? (
                    <IconButton
                      icon="archive"
                      accessibilityLabel="Archive student"
                      variant="tonal"
                      color={theme.colors.textPrimary}
                      size={20}
                      disabled={busy}
                      onPress={confirmArchive}
                    />
                  ) : null}
                </View>
              </View>
            </View>

            <Text token="caption" color={theme.colors.textMuted}>Archive is reversible and keeps the student available in your records.</Text>
          </View>
        </Card>
      </View>

      <ConfirmDialog
        visible={confirmation !== null}
        title={confirmation === 'archive' ? 'Archive this student?' : 'Delete student permanently?'}
        message={confirmation === 'archive'
          ? 'Their sessions, expenses and statements will be kept. You can restore this student later.'
          : 'The student profile and avatar will be deleted forever. Existing sessions, expenses, payments and statements will be kept as historical records.'}
        confirmLabel={confirmation === 'archive' ? 'Archive student' : 'Delete permanently'}
        icon={confirmation === 'archive' ? 'archive' : 'trash-outline'}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          const action = confirmation;
          setConfirmation(null);
          if (action === 'archive') void mutate('archive');
          if (action === 'delete') void deletePermanently();
        }}
      />
    </Screen>
  );
}
