import React, { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { Button, Card, Chip, DateField, SectionHeader, Text, TextField } from '@/components/ui';
import type { EditableSessionStatus, SessionInput } from '@/services/sessions.service';
import { useTheme } from '@/theme';
import type { RateType, Session, Student, TopicCategory } from '@/types';
import { formatPeso } from '@/utils/currency';
import { combineManilaDateAndTime, formatDisplayDate, formatDisplayTime, formatTimeInput } from '@/utils/date';
import { computeDurationMinutes, computeSessionFee, defaultBillableFor } from '@/utils/pricing';
import {
  issuesByField,
  LIMITS,
  parseClockTime,
  parseRate,
  validateSession,
  type SessionFormValues,
} from '@/utils/validation';

const TOPICS: { value: TopicCategory; label: string }[] = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'spelling', label: 'Spelling' },
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'review', label: 'Review' },
  { value: 'exam_preparation', label: 'Exam prep' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: EditableSessionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'student_absent', label: 'Student absent' },
  { value: 'cancelled_by_parent', label: 'Parent cancelled' },
  { value: 'cancelled_by_tutor', label: 'I cancelled' },
];

const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'hourly', label: 'Per hour' },
  { value: 'per_session', label: 'Per session' },
];

type TimePeriod = 'AM' | 'PM';

interface EditableTimeParts {
  hour: string;
  minute: string;
  period: TimePeriod;
}

function editableTimeParts(value: string): EditableTimeParts {
  const parsed = parseClockTime(value);
  if (!parsed) return { hour: '', minute: '', period: 'AM' };
  return {
    hour: String(parsed.hours % 12 || 12),
    minute: String(parsed.minutes).padStart(2, '0'),
    period: parsed.hours >= 12 ? 'PM' : 'AM',
  };
}

interface TimeFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  hourInputRef?: React.RefObject<TextInput | null>;
  minuteInputRef?: React.RefObject<TextInput | null>;
  nextInputRef?: React.RefObject<TextInput | null>;
}

function TimeField({ label, value, error, onChange, hourInputRef, minuteInputRef, nextInputRef }: TimeFieldProps) {
  const theme = useTheme();
  const initial = editableTimeParts(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<TimePeriod>(initial.period);

  function commit(nextHour: string, nextMinute: string, nextPeriod: TimePeriod) {
    onChange(`${nextHour}:${nextMinute} ${nextPeriod}`);
  }

  function handleHourChange(raw: string) {
    const next = raw.replace(/\D/g, '').slice(0, 2);
    setHour(next);
    commit(next, minute, period);
  }

  function handleMinuteChange(raw: string) {
    const next = raw.replace(/\D/g, '').slice(0, 2);
    setMinute(next);
    commit(hour, next, period);
  }

  function handlePeriodChange(next: TimePeriod) {
    setPeriod(next);
    commit(hour, minute, next);
  }

  return (
    <View style={{ gap: theme.space[8] }}>
      <Text token="caption" color={theme.colors.textSecondary}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space[8] }}>
        <View style={{ width: 64 }}>
          <TextField value={hour} onChangeText={handleHourChange} placeholder="4" keyboardType="number-pad" maxLength={2} compact error={error} showErrorMessage={false} inputRef={hourInputRef} returnKeyType="next" onSubmitEditing={() => minuteInputRef?.current?.focus()} />
        </View>
        <Text token="h2" color={theme.colors.textSecondary} style={{ paddingBottom: theme.space[8] }}>:</Text>
        <View style={{ width: 64 }}>
          <TextField value={minute} onChangeText={handleMinuteChange} placeholder="00" keyboardType="number-pad" maxLength={2} compact error={error} showErrorMessage={false} inputRef={minuteInputRef} returnKeyType="next" onSubmitEditing={() => nextInputRef?.current?.focus()} />
        </View>
        <View style={{ flex: 1, gap: theme.space[4] }}>
          <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
            <Chip label="AM" variant="filter" selected={period === 'AM'} onPress={() => handlePeriodChange('AM')} />
            <Chip label="PM" variant="filter" selected={period === 'PM'} onPress={() => handlePeriodChange('PM')} />
          </View>
        </View>
      </View>
      {error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : null}
    </View>
  );
}

export interface SessionFormProps {
  students: Student[];
  initial?: Session | null;
  preferredStudentId?: string;
  mode?: 'full' | 'reschedule';
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: SessionInput) => void;
}

export function SessionForm({
  students,
  initial = null,
  preferredStudentId,
  mode = 'full',
  submitLabel,
  busy = false,
  onSubmit,
}: SessionFormProps) {
  const theme = useTheme();
  const preferred = students.find((student) => student.id === preferredStudentId);
  const firstStudent = students.find((student) => student.status === 'active') ?? students[0];
  const startingStudent = students.find((student) => student.id === initial?.studentId)
    ?? preferred
    ?? firstStudent;

  const [values, setValues] = useState<SessionFormValues>({
    studentId: initial?.studentId ?? startingStudent?.id ?? '',
    date: initial?.startsAt ?? new Date(),
    startTime: initial ? formatTimeInput(initial.startsAt) : '4:00 PM',
    endTime: initial ? formatTimeInput(initial.endsAt) : '5:00 PM',
    subject: initial?.subject ?? '',
    topicDetails: initial?.topicDetails ?? '',
    appliedRate: String(initial?.appliedRate ?? startingStudent?.defaultRate ?? ''),
  });
  const [topicCategory, setTopicCategory] = useState<TopicCategory>(initial?.topicCategory ?? 'assignment');
  const [rateType, setRateType] = useState<RateType>(initial?.rateType ?? startingStudent?.rateType ?? 'hourly');
  const [status, setStatus] = useState<EditableSessionStatus>(
    initial?.status === 'rescheduled' ? 'scheduled' : initial?.status ?? 'scheduled',
  );
  const [billable, setBillable] = useState(initial?.billable ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startHourRef = useRef<TextInput>(null);
  const startMinuteRef = useRef<TextInput>(null);
  const endHourRef = useRef<TextInput>(null);
  const endMinuteRef = useRef<TextInput>(null);
  const subjectRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const preview = useMemo(() => {
    const start = parseClockTime(values.startTime);
    const end = parseClockTime(values.endTime);
    const rate = parseRate(values.appliedRate);
    if (!values.date || !start || !end || rate === null) return null;
    const startsAt = combineManilaDateAndTime(values.date, start.hours, start.minutes);
    const endsAt = combineManilaDateAndTime(values.date, end.hours, end.minutes);
    const durationMinutes = computeDurationMinutes(startsAt, endsAt);
    return {
      durationMinutes,
      fee: computeSessionFee({ rateType, appliedRate: rate, durationMinutes }),
    };
  }, [values, rateType]);

  function update<K extends keyof SessionFormValues>(key: K, value: SessionFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function chooseStudent(student: Student) {
    update('studentId', student.id);
    setRateType(student.rateType);
    update('appliedRate', String(student.defaultRate));
  }

  function chooseStatus(next: EditableSessionStatus) {
    setStatus(next);
    setBillable(defaultBillableFor(next));
  }

  function handleSubmit() {
    const issues = validateSession(values);
    if (notes.length > LIMITS.notes) {
      issues.push({ field: 'notes', message: `Notes must be under ${LIMITS.notes} characters.` });
    }
    if (issues.length > 0) {
      setErrors(issuesByField(issues));
      return;
    }

    const start = parseClockTime(values.startTime)!;
    const end = parseClockTime(values.endTime)!;
    const rescheduling = mode === 'reschedule' && initial;
    onSubmit({
      studentId: rescheduling ? initial.studentId : values.studentId,
      startsAt: combineManilaDateAndTime(values.date!, start.hours, start.minutes),
      endsAt: combineManilaDateAndTime(values.date!, end.hours, end.minutes),
      subject: rescheduling ? initial.subject : values.subject.trim(),
      topicCategory: rescheduling ? initial.topicCategory : topicCategory,
      topicDetails: rescheduling ? initial.topicDetails : values.topicDetails.trim(),
      notes: rescheduling ? initial.notes : notes.trim(),
      rateType: rescheduling ? initial.rateType : rateType,
      appliedRate: rescheduling ? initial.appliedRate : parseRate(values.appliedRate)!,
      status: rescheduling ? 'scheduled' : status,
      billable: rescheduling ? false : billable,
    });
  }

  return (
    <View style={{ gap: theme.space[24] }}>
      <Card variant="raised">
        <SectionHeader title={mode === 'reschedule' ? 'New schedule' : 'Student and schedule'} />
        <View style={{ gap: theme.space[16] }}>
          {mode === 'reschedule' && initial ? (
            <Card variant="flat">
              <View style={{ gap: theme.space[4] }}>
                <Text token="micro" color={theme.colors.textMuted}>CURRENT SESSION</Text>
                <Text token="bodyStrong">{formatDisplayDate(initial.startsAt)} · {formatDisplayTime(initial.startsAt)} – {formatDisplayTime(initial.endsAt)}</Text>
                <Text token="caption" color={theme.colors.textSecondary}>Student, lesson details, rate and notes will stay unchanged.</Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: theme.space[8] }}>
              <Text token="caption" color={theme.colors.textSecondary}>Student</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                {students.map((student) => (
                  <Chip
                    key={student.id}
                    label={student.nickname}
                    variant="filter"
                    selected={values.studentId === student.id}
                    onPress={() => chooseStudent(student)}
                  />
                ))}
              </View>
              {errors.studentId ? <Text token="caption" color={theme.colors.danger}>{errors.studentId}</Text> : null}
            </View>
          )}
          <DateField label="Date" value={values.date} onChange={(date) => update('date', date)} error={errors.date} pickerOnly />
          <TimeField label="Start time" value={values.startTime} onChange={(value) => update('startTime', value)} error={errors.startTime} hourInputRef={startHourRef} minuteInputRef={startMinuteRef} nextInputRef={endHourRef} />
          <TimeField label="End time" value={values.endTime} onChange={(value) => update('endTime', value)} error={errors.endTime} hourInputRef={endHourRef} minuteInputRef={endMinuteRef} nextInputRef={mode === 'reschedule' ? undefined : subjectRef} />
        </View>
      </Card>

      {mode !== 'reschedule' ? <Card variant="raised">
        <SectionHeader title="Lesson" />
        <View style={{ gap: theme.space[16] }}>
          <TextField label="Subject" value={values.subject} onChangeText={(value) => update('subject', value)} placeholder="Mathematics" icon="book-outline" maxLength={LIMITS.subject} error={errors.subject} inputRef={subjectRef} returnKeyType="next" onSubmitEditing={() => rateRef.current?.focus()} />
          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>Topic category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {TOPICS.map((topic) => <Chip key={topic.value} label={topic.label} variant="filter" selected={topicCategory === topic.value} onPress={() => setTopicCategory(topic.value)} />)}
            </View>
          </View>
        </View>
      </Card> : null}

      {mode !== 'reschedule' ? <Card variant="raised">
        <SectionHeader title="Fee" />
        <View style={{ gap: theme.space[16] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {RATE_TYPES.map((type) => <Chip key={type.value} label={type.label} variant="filter" selected={rateType === type.value} onPress={() => setRateType(type.value)} />)}
          </View>
          <TextField label={rateType === 'hourly' ? 'Rate per hour' : 'Rate per session'} value={values.appliedRate} onChangeText={(value) => update('appliedRate', value)} placeholder="350" keyboardType="decimal-pad" icon="cash-outline" error={errors.appliedRate} inputRef={rateRef} returnKeyType="next" onSubmitEditing={() => notesRef.current?.focus()} />
          {preview ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text token="caption" color={theme.colors.textMuted}>{preview.durationMinutes} minutes</Text>
              <Text token="h2" tabular>{formatPeso(preview.fee)}</Text>
            </View>
          ) : null}
        </View>
      </Card> : null}

      <Card variant="raised">
        <SectionHeader title="Status" />
        <View style={{ gap: theme.space[12] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {STATUSES.map((item) => <Chip key={item.value} label={item.label} variant="filter" selected={status === item.value} onPress={() => chooseStatus(item.value)} />)}
          </View>
          {status === 'student_absent' || status === 'cancelled_by_parent' ? (
            <Chip label="Charge this session" icon="cash-outline" variant="filter" selected={billable} onPress={() => setBillable((value) => !value)} />
          ) : null}
          {status === 'completed' ? <Text token="caption" color={theme.colors.successText}>Completed sessions are charged automatically.</Text> : null}
          <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Private session notes" multiline maxLength={LIMITS.notes} showCounter error={errors.notes} inputRef={notesRef} />
        </View>
      </Card>

      <Button label={submitLabel} onPress={handleSubmit} loading={busy} fullWidth />
    </View>
  );
}
