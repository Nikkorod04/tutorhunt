/**
 * Student details.
 *
 * Loads by route id so a deep link works. Archive and restore both go through
 * the service, and restore re-checks the plan cap because an archived student
 * counts again once it is active.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  SectionHeader,
  SessionStatusChip,
  Skeleton,
  Text,
} from '@/components/ui';
import { archiveStudent, getStudent, restoreStudent, setStudentInactive, studentErrorMessage, StudentLimitError } from '@/services/students.service';
import { listSessions } from '@/services/sessions.service';
import { useAuthStore } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useTheme, type Tone } from '@/theme';
import type { Session, Student, StudentStatus } from '@/types';
import { ageFromBirthday, formatDisplayDate, formatDisplayDateTime } from '@/utils/date';
import { formatPeso, formatPesoCompact } from '@/utils/currency';

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

export default function StudentDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const entitlement = useAuthStore((state) => state.entitlement);
  const upsert = useStudentStore((state) => state.upsert);

  const [student, setStudent] = useState<Student | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      setStudent(found);
      setRecentSessions(sessions.items);
    } catch {
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(action: 'archive' | 'restore' | 'inactive') {
    if (!profile || !id || !student) return;

    setBusy(true);
    try {
      if (action === 'archive') await archiveStudent(profile.uid, id);
      if (action === 'restore') await restoreStudent(profile.uid, id, entitlement?.plan ?? 'free');
      if (action === 'inactive') await setStudentInactive(profile.uid, id);

      const nextStatus: StudentStatus =
        action === 'archive' ? 'archived' : action === 'restore' ? 'active' : 'inactive';

      const updated: Student = { ...student, status: nextStatus, updatedAt: new Date() };
      setStudent(updated);
      upsert(updated);
    } catch (caught) {
      Alert.alert(
        caught instanceof StudentLimitError ? 'Plan limit reached' : 'Could not update',
        studentErrorMessage(caught),
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive() {
    Alert.alert(
      'Archive this student?',
      'Their sessions, expenses and statements are kept. You can restore them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => void mutate('archive') },
      ],
    );
  }

  if (loading) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}>
          <Skeleton width="50%" height={28} />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </View>
      </Screen>
    );
  }

  if (!student) {
    return (
      <Screen scroll>
        <EmptyState
          icon="alert-circle-outline"
          title="Student not found"
          description="It may have been removed, or the link is out of date."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: theme.space[8], gap: theme.space[24] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[16] }}>
          <Avatar
            builtin={student.avatarType === 'custom' ? undefined : student.avatarType}
            imageUrl={student.avatarType === 'custom' ? student.customAvatarUrl : null}
            name={student.nickname}
            size="lg"
          />
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <Text token="h2" numberOfLines={1}>
              {student.nickname}
            </Text>
            <Chip
              variant="status"
              tone={STATUS_TONE[student.status]}
              label={STATUS_LABEL[student.status]}
            />
          </View>
        </View>

        <Card variant="raised">
          <View style={{ flexDirection: 'row', gap: theme.space[16] }}>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="micro" color={theme.colors.textSecondary}>
                Age
              </Text>
              <Text token="h2" tabular>
                {student.birthday ? String(ageFromBirthday(student.birthday)) : '—'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="micro" color={theme.colors.textSecondary}>
                Default rate
              </Text>
              <Text token="h2" tabular>
                {formatPeso(student.defaultRate)}
              </Text>
            </View>
          </View>
          <Text token="caption" color={theme.colors.textMuted} style={{ marginTop: theme.space[8] }}>
            {student.rateType === 'hourly' ? 'Charged per hour' : 'Charged per session'}
            {student.birthday ? ` · Born ${formatDisplayDate(student.birthday)}` : ''}
          </Text>
        </Card>

        <View>
          <SectionHeader title="Details" />
          <Card variant="flat" padded={false}>
            <ListRow
              title="School"
              subtitle={student.school || 'Not set'}
              leading={<Ionicons name="school-outline" size={18} color={theme.colors.textMuted} />}
              divider
            />
            <ListRow
              title="Grade level"
              subtitle={student.gradeLevel || 'Not set'}
              leading={<Ionicons name="layers-outline" size={18} color={theme.colors.textMuted} />}
              divider
            />
            <ListRow
              title="Parent or guardian"
              subtitle={student.parentGuardianName || 'Not set'}
              leading={<Ionicons name="people-outline" size={18} color={theme.colors.textMuted} />}
              divider
            />
            <ListRow
              title="Parent contact"
              subtitle={student.parentContact || 'Not set'}
              leading={<Ionicons name="call-outline" size={18} color={theme.colors.textMuted} />}
              divider
            />
            <ListRow
              title="Tutoring place"
              subtitle={student.tutoringPlace || 'Not set'}
              leading={<Ionicons name="location-outline" size={18} color={theme.colors.textMuted} />}
            />
          </Card>
        </View>

        {student.notes ? (
          <View>
            <SectionHeader title="Notes" />
            <Card variant="flat">
              <Text token="body">{student.notes}</Text>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionHeader
            title="Recent sessions"
            action={
              <Button
                label="View all"
                size="sm"
                variant="ghost"
                onPress={() => router.push(`/sessions?studentId=${student.id}` as never)}
              />
            }
          />
          {recentSessions.length > 0 ? (
            <Card variant="flat" padded={false}>
              {recentSessions.map((session, index) => (
                <ListRow
                  key={session.id}
                  title={session.subject}
                  subtitle={formatDisplayDateTime(session.startsAt)}
                  leading={<Ionicons name="book-outline" size={18} color={theme.colors.primary} />}
                  trailing={<View style={{ alignItems: 'flex-end', gap: theme.space[4] }}><Text token="caption" tabular>{formatPesoCompact(session.sessionFee)}</Text><SessionStatusChip status={session.status} /></View>}
                  divider={index < recentSessions.length - 1}
                  showChevron
                  onPress={() => router.push(`/session-detail?id=${session.id}` as never)}
                />
              ))}
            </Card>
          ) : (
            <Card variant="flat">
              <Text token="caption" color={theme.colors.textMuted}>No sessions recorded for this student.</Text>
            </Card>
          )}
        </View>

        <View style={{ gap: theme.space[12] }}>
          <Button
            label="Edit student"
            icon="create-outline"
            variant="secondary"
            onPress={() => router.push(`/student-edit?id=${student.id}` as never)}
            fullWidth
          />
          {student.status === 'archived' ? (
            <Button
              label="Restore student"
              icon="refresh-outline"
              loading={busy}
              onPress={() => void mutate('restore')}
              fullWidth
            />
          ) : (
            <Button
              label="Archive student"
              icon="archive-outline"
              variant="destructive"
              loading={busy}
              onPress={confirmArchive}
              fullWidth
            />
          )}
        </View>

        <Button
          label="Add session"
          icon="add"
          onPress={() => router.push(`/session-new?studentId=${student.id}` as never)}
          fullWidth
        />
        <Button
          label="Add expense"
          icon="wallet-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/expense-new', params: { studentId: student.id } } as never)}
          fullWidth
        />
        <Button
          label="Record payment"
          icon="card-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/payment-new', params: { studentId: student.id } } as never)}
          fullWidth
        />
        <Button
          label="View payments"
          icon="list-outline"
          variant="ghost"
          onPress={() => router.push({ pathname: '/payments', params: { studentId: student.id } } as never)}
          fullWidth
        />
      </View>
    </Screen>
  );
}
