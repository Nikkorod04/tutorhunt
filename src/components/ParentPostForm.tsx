import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, SectionHeader, Text, TextField } from '@/components/ui';
import { LocationPicker } from '@/components/LocationPicker';
import { TUTOR_GRADE_LEVELS, TUTOR_SUBJECTS } from '@/constants/tutorProfile';
import { TUTOR_HUNT_CITIES, locationForCity } from '@/constants/locations';
import type { ParentPost, ParentPostBudgetType, ParentPostTutoringMode } from '@/types';
import type { ParentPostInput } from '@/services/parentPosts.service';
import { parseRate } from '@/utils/validation';
import { useTheme } from '@/theme';

export function ParentPostForm({ initial = null, submitLabel, busy = false, onSubmit }: { initial?: ParentPost | null; submitLabel: string; busy?: boolean; onSubmit: (input: ParentPostInput) => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? ''); const [gradeLevel, setGradeLevel] = useState(initial?.gradeLevel ?? '');
  const [city, setCity] = useState(initial?.city ?? ''); const [area, setArea] = useState(initial?.area ?? ''); const [scheduleText, setScheduleText] = useState(initial?.scheduleText ?? '');
  const [mode, setMode] = useState<ParentPostTutoringMode>(initial?.tutoringMode ?? 'either'); const [budgetType, setBudgetType] = useState<ParentPostBudgetType>(initial?.budgetType ?? 'negotiable');
  const [minBudget, setMinBudget] = useState(initial?.minBudget === null || initial?.minBudget === undefined ? '' : String(initial.minBudget)); const [maxBudget, setMaxBudget] = useState(initial?.maxBudget === null || initial?.maxBudget === undefined ? '' : String(initial.maxBudget));
  const [contactVisible, setContactVisible] = useState(initial?.contactVisible ?? false); const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const min = parseRate(minBudget); const max = parseRate(maxBudget);
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'A request title is required.';
    if (!description.trim()) nextErrors.description = 'Describe what kind of help the learner needs.';
    if (!subject.trim()) nextErrors.subject = 'Choose a subject.';
    if (!gradeLevel) nextErrors.gradeLevel = 'Choose a grade level.';
    if (!city) nextErrors.city = 'Choose a city or municipality.';
    if (!scheduleText.trim()) nextErrors.scheduleText = 'Add a preferred schedule.';
    if (minBudget.trim() && min === null) nextErrors.minBudget = 'Enter a valid minimum budget.';
    if (maxBudget.trim() && max === null) nextErrors.maxBudget = 'Enter a valid maximum budget.';
    if (min !== null && max !== null && min > max) nextErrors.maxBudget = 'Maximum budget must be at least the minimum budget.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({ title: title.trim(), description: description.trim(), subject: subject.trim(), gradeLevel, city, area, scheduleText: scheduleText.trim(), tutoringMode: mode, budgetType, minBudget: min, maxBudget: max, contactVisible });
  }

  function clearError(field: string) {
    setErrors((current) => current[field] ? { ...current, [field]: '' } : current);
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const barangays = locationForCity(city)?.barangays ?? [];
  return <View style={{ gap: theme.space[20] }}>
    {hasErrors ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>Review the highlighted fields before publishing this request.</Text></Card> : null}
    <Card variant="raised"><SectionHeader title="What do you need?" /><View style={{ gap: theme.space[16] }}>
      <TextField label="Request title" value={title} onChangeText={(value) => { setTitle(value); clearError('title'); }} placeholder="Math tutor for Grade 6" error={errors.title} />
      <TextField label="Description" value={description} onChangeText={(value) => { setDescription(value); clearError('description'); }} placeholder="Tell tutors what kind of help you need" multiline maxLength={800} showCounter error={errors.description} />
      <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Subject</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{TUTOR_SUBJECTS.map((item) => <Chip key={item} label={item} selected={subject === item} onPress={() => { setSubject(item); clearError('subject'); }} />)}</View>{errors.subject ? <Text token="caption" color={theme.colors.danger}>{errors.subject}</Text> : null}</View>
      <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Grade level</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{TUTOR_GRADE_LEVELS.map((item) => <Chip key={item} label={item} selected={gradeLevel === item} onPress={() => { setGradeLevel(item); clearError('gradeLevel'); }} />)}</View>{errors.gradeLevel ? <Text token="caption" color={theme.colors.danger}>{errors.gradeLevel}</Text> : null}</View>
    </View></Card>
    <Card variant="raised"><SectionHeader title="Location and schedule" /><View style={{ gap: theme.space[16] }}>
      <LocationPicker label="City or municipality" value={city} options={TUTOR_HUNT_CITIES} placeholder="Choose a city" error={errors.city} onChange={(value) => { setCity(String(value)); setArea(''); clearError('city'); }} />
      <LocationPicker label="Barangay (optional)" value={area} options={barangays} placeholder={city ? 'Choose a barangay' : 'Choose a city first'} onChange={(value) => setArea(String(value))} disabled={!city} />
      <TextField label="Preferred schedule" value={scheduleText} onChangeText={(value) => { setScheduleText(value); clearError('scheduleText'); }} placeholder="Weekdays after 4 PM" error={errors.scheduleText} />
      <View style={{ gap: theme.space[8] }}><Text token="caption" color={theme.colors.textSecondary}>Tutoring mode</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{([['face_to_face', 'Face-to-face'], ['online', 'Online'], ['either', 'Either']] as const).map(([value, label]) => <Chip key={value} label={label} selected={mode === value} onPress={() => setMode(value)} />)}</View></View>
    </View></Card>
    <Card variant="raised"><SectionHeader title="Budget and contact" /><View style={{ gap: theme.space[16] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>{([['hourly', 'Per hour'], ['per_session', 'Per session'], ['negotiable', 'Negotiable']] as const).map(([value, label]) => <Chip key={value} label={label} selected={budgetType === value} onPress={() => setBudgetType(value)} />)}</View>
      <TextField label="Minimum budget (optional)" value={minBudget} onChangeText={(value) => { setMinBudget(value); clearError('minBudget'); if (maxBudget && parseRate(value) !== null && parseRate(maxBudget) !== null && parseRate(value)! <= parseRate(maxBudget)!) clearError('maxBudget'); }} placeholder="300" keyboardType="decimal-pad" error={errors.minBudget} />
      <TextField label="Maximum budget (optional)" value={maxBudget} onChangeText={(value) => { setMaxBudget(value); clearError('maxBudget'); }} placeholder="500" keyboardType="decimal-pad" error={errors.maxBudget} />
      <Chip label="Let interested tutors see my contact details" icon="eye-outline" selected={contactVisible} onPress={() => setContactVisible((value) => !value)} />
      <Text token="caption" color={theme.colors.textMuted}>Your contact details stay in your parent profile and are only readable when you opt in here.</Text>
    </View></Card>
    <Button label={submitLabel} onPress={submit} loading={busy} fullWidth />
  </View>;
}
