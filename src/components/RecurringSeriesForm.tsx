import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, DateField, SectionHeader, Text, TextField } from '@/components/ui';
import type { RecurringSeries, Student, TopicCategory } from '@/types';
import type { RecurringSeriesInput } from '@/services/recurring.service';
import { formatDisplayDate } from '@/utils/date';
import { parseClockTime, parseRate } from '@/utils/validation';
import { useTheme } from '@/theme';

const TOPICS: { value: TopicCategory; label: string }[] = [
  { value: 'assignment', label: 'Assignment' }, { value: 'spelling', label: 'Spelling' },
  { value: 'reading', label: 'Reading' }, { value: 'writing', label: 'Writing' },
  { value: 'review', label: 'Review' }, { value: 'exam_preparation', label: 'Exam prep' },
  { value: 'project', label: 'Project' }, { value: 'other', label: 'Other' },
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface RecurringSeriesFormProps {
  students: Student[];
  initial?: RecurringSeries | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: RecurringSeriesInput) => void;
}

export function RecurringSeriesForm({ students, initial = null, submitLabel, busy = false, onSubmit }: RecurringSeriesFormProps) {
  const theme = useTheme();
  const [studentId, setStudentId] = useState(initial?.studentId ?? students[0]?.id ?? '');
  const [startDate, setStartDate] = useState<Date | null>(initial?.startDate ?? new Date());
  const [endDate, setEndDate] = useState<Date | null>(initial?.endDate ?? null);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1]);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '4:00 PM');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '5:00 PM');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [topicCategory, setTopicCategory] = useState<TopicCategory>(initial?.topicCategory ?? 'assignment');
  const [rateType, setRateType] = useState<'hourly' | 'per_session'>(initial?.rateType ?? 'hourly');
  const [rate, setRate] = useState(String(initial?.appliedRate ?? ''));
  const [skipDate, setSkipDate] = useState<Date | null>(null);
  const [skipDates, setSkipDates] = useState<Date[]>(initial?.skipDates ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (initial || endDate) return;
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    setEndDate(defaultEnd);
  }, [endDate, initial]);

  function submit() {
    const parsedRate = parseRate(rate);
    const nextErrors: Record<string, string> = {};
    if (!studentId) nextErrors.studentId = 'Choose a student.';
    if (weekdays.length === 0) nextErrors.weekdays = 'Choose at least one weekday.';
    if (!startDate) nextErrors.startDate = 'Choose the first session date.';
    if (!endDate) nextErrors.endDate = 'Choose the last session date.';
    if (!parseClockTime(startTime)) nextErrors.startTime = 'Enter a time like 4:00 PM.';
    if (!parseClockTime(endTime)) nextErrors.endTime = 'Enter a time like 5:00 PM.';
    if (!subject.trim()) nextErrors.subject = 'A subject is required.';
    if (parsedRate === null) nextErrors.rate = 'Enter a valid rate.';
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) nextErrors.endDate = 'Last session date must be after the first session date.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!startDate || !endDate || parsedRate === null) return;
    onSubmit({ studentId, weekdays, startDate, endDate, startTime, endTime, subject: subject.trim(), topicCategory, rateType, appliedRate: parsedRate, skipDates });
  }

  function clearError(field: string) {
    setErrors((current) => current[field] ? { ...current, [field]: '' } : current);
  }

  const hasErrors = Object.values(errors).some(Boolean);

  function addSkipDate() {
    if (!skipDate || skipDates.some((date) => date.getTime() === skipDate.getTime())) return;
    setSkipDates((current) => [...current, skipDate]);
    setSkipDate(null);
  }

  return (
    <View style={{ gap: theme.space[20] }}>
      {hasErrors ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>Review the highlighted fields before creating this recurring series.</Text></Card> : null}
      <Card variant="raised">
        <SectionHeader title="Student and schedule" />
        <View style={{ gap: theme.space[16] }}>
          <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Student</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{students.map((student) => <Chip key={student.id} label={student.nickname} selected={studentId === student.id} onPress={() => { setStudentId(student.id); clearError('studentId'); }} />)}</View>{errors.studentId ? <Text token="caption" color={theme.colors.danger}>{errors.studentId}</Text> : null}</View>
          <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Repeats on</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{WEEKDAYS.map((label, index) => <Chip key={label} label={label} selected={weekdays.includes(index)} onPress={() => { setWeekdays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort()); clearError('weekdays'); }} />)}</View>{errors.weekdays ? <Text token="caption" color={theme.colors.danger}>{errors.weekdays}</Text> : null}</View>
          <DateField label="First session" value={startDate} onChange={(value) => { setStartDate(value); clearError('startDate'); clearError('endDate'); }} error={errors.startDate} />
          <DateField label="Last session" value={endDate} onChange={(value) => { setEndDate(value); clearError('endDate'); }} error={errors.endDate} />
          <TextField label="Start time" value={startTime} onChangeText={(value) => { setStartTime(value); clearError('startTime'); }} placeholder="4:00 PM" error={errors.startTime} />
          <TextField label="End time" value={endTime} onChangeText={(value) => { setEndTime(value); clearError('endTime'); }} placeholder="5:00 PM" error={errors.endTime} />
          <Text token="caption" color={theme.colors.textMuted}>Up to 100 sessions or 6 months, whichever comes first.</Text>
        </View>
      </Card>
      <Card variant="raised">
        <SectionHeader title="Lesson and fee" />
        <View style={{ gap: theme.space[16] }}>
          <TextField label="Subject" value={subject} onChangeText={(value) => { setSubject(value); clearError('subject'); }} placeholder="Mathematics" error={errors.subject} />
          <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Topic category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{TOPICS.map((topic) => <Chip key={topic.value} label={topic.label} selected={topicCategory === topic.value} onPress={() => setTopicCategory(topic.value)} />)}</View></View>
          <View style={{ flexDirection: 'row', gap: theme.space[8] }}><Chip label="Per hour" selected={rateType === 'hourly'} onPress={() => setRateType('hourly')} /><Chip label="Per session" selected={rateType === 'per_session'} onPress={() => setRateType('per_session')} /></View>
          <TextField label={rateType === 'hourly' ? 'Rate per hour' : 'Rate per session'} value={rate} onChangeText={(value) => { setRate(value); clearError('rate'); }} placeholder="350" keyboardType="decimal-pad" error={errors.rate} />
        </View>
      </Card>
      <Card variant="raised">
        <SectionHeader title="Skip dates" />
        <View style={{ gap: theme.space[12] }}>
          <Text token="caption" color={theme.colors.textMuted}>Leave out holidays or days when a session will not happen.</Text>
          <DateField label="Holiday date" value={skipDate} onChange={setSkipDate} />
          <Button label="Add skip date" variant="secondary" size="sm" onPress={addSkipDate} />
          {skipDates.map((date) => <Chip key={date.getTime()} label={formatDisplayDate(date)} variant="removable" onRemove={() => setSkipDates((current) => current.filter((item) => item.getTime() !== date.getTime()))} />)}
        </View>
      </Card>
      <Button label={submitLabel} onPress={submit} loading={busy} fullWidth />
    </View>
  );
}
