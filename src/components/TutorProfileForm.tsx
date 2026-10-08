import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ui';
import { LocationPicker } from '@/components/LocationPicker';
import { CONTACT_PREFERENCE_LABELS, TUTOR_GRADE_LEVELS, TUTOR_MODE_LABELS, TUTOR_SUBJECTS } from '@/constants/tutorProfile';
import { locationForCity, TUTOR_HUNT_LOCATIONS, type ServiceProvince } from '@/constants/locations';
import type { TutorProfile, TutoringMode } from '@/types';
import type { TutorProfileInput } from '@/services/tutorProfiles.service';
import { contactHelper, contactPlaceholder, contactValidationError } from '@/utils/contact';
import { parseRate } from '@/utils/validation';
import { useTheme } from '@/theme';

const CONTACT_OPTIONS = [
  { value: 'messenger', label: CONTACT_PREFERENCE_LABELS.messenger },
  { value: 'facebook', label: CONTACT_PREFERENCE_LABELS.facebook },
  { value: 'phone', label: CONTACT_PREFERENCE_LABELS.phone },
  { value: 'email', label: CONTACT_PREFERENCE_LABELS.email },
] as const;

interface TutorProfileFormProps {
  accountName: string;
  accountEmail: string;
  initial?: TutorProfile | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: TutorProfileInput) => void;
}

function uniqueTags(values: string[]): string[] {
  return [...new Map(values.map((value) => [value.trim().toLowerCase(), value.trim()])).values()];
}

export function TutorProfileForm({
  accountName,
  accountEmail,
  initial = null,
  submitLabel,
  busy = false,
  onSubmit,
}: TutorProfileFormProps) {
  const theme = useTheme();
  const [shortBio, setShortBio] = useState(initial?.shortBio ?? '');
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [gradeLevels, setGradeLevels] = useState<string[]>(initial?.gradeLevels ?? []);
  const [city, setCity] = useState(initial?.city ?? '');
  const [province, setProvince] = useState<ServiceProvince>(initial?.province ?? locationForCity(initial?.city)?.province ?? 'Leyte');
  const [barangaysServed, setBarangaysServed] = useState<string[]>(initial?.servesAllBarangays ? [] : initial?.barangaysServed?.length ? initial.barangaysServed : initial?.areasServed ?? []);
  const [servesAllBarangays, setServesAllBarangays] = useState(initial?.servesAllBarangays ?? true);
  const [tutoringModes, setTutoringModes] = useState<TutoringMode[]>(initial?.tutoringModes ?? ['online']);
  const [primaryMode, setPrimaryMode] = useState<TutoringMode>(initial?.primaryMode ?? 'online');
  const [minRate, setMinRate] = useState(initial?.minRate === null || initial?.minRate === undefined ? '' : String(initial.minRate));
  const [maxRate, setMaxRate] = useState(initial?.maxRate === null || initial?.maxRate === undefined ? '' : String(initial.maxRate));
  const [education, setEducation] = useState(initial?.education ?? '');
  const [experienceSummary, setExperienceSummary] = useState(initial?.experienceSummary ?? '');
  const [contactPreference, setContactPreference] = useState<TutorProfile['contactPreference']>(initial?.contactPreference ?? 'messenger');
  const [contactValue, setContactValue] = useState(initial?.contactValue ?? '');
  const [isVisible, setIsVisible] = useState(initial?.isVisible ?? false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(field: string) {
    setErrors((current) => current[field] ? { ...current, [field]: '' } : current);
  }

  function toggleSubject(subject: string) {
    setSubjects((current) => current.some((item) => item.toLowerCase() === subject.toLowerCase())
      ? current.filter((item) => item.toLowerCase() !== subject.toLowerCase())
      : [...current, subject]);
    setErrors((current) => ({ ...current, subjects: '' }));
  }

  function toggleGradeLevel(gradeLevel: string) {
    setGradeLevels((current) => current.includes(gradeLevel)
      ? current.filter((item) => item !== gradeLevel)
      : [...current, gradeLevel]);
    setErrors((current) => ({ ...current, gradeLevels: '' }));
  }

  function addSubject() {
    const value = subjectDraft.trim();
    if (!value) return;
    setSubjects((current) => uniqueTags([...current, value]));
    setSubjectDraft('');
    setErrors((current) => ({ ...current, subjects: '' }));
  }

  function toggleMode(mode: TutoringMode) {
    setTutoringModes((current) => {
      if (current.includes(mode)) {
        if (current.length === 1) return current;
        const next = current.filter((item) => item !== mode);
        if (primaryMode === mode) setPrimaryMode(next[0]);
        return next;
      }
      return [...current, mode];
    });
    setErrors((current) => ({ ...current, tutoringModes: '' }));
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    const parsedMinRate = minRate.trim() ? parseRate(minRate) : null;
    const parsedMaxRate = maxRate.trim() ? parseRate(maxRate) : null;

    if (subjects.length === 0) nextErrors.subjects = 'Choose at least one subject.';
    if (gradeLevels.length === 0) nextErrors.gradeLevels = 'Choose at least one grade level.';
    if (!locationForCity(city)) nextErrors.city = 'Choose a city or municipality from the list.';
    if (tutoringModes.includes('face_to_face') && !servesAllBarangays && barangaysServed.length === 0) {
      nextErrors.barangays = 'Choose at least one barangay or select all barangays.';
    }
    if (tutoringModes.length === 0) nextErrors.tutoringModes = 'Choose at least one tutoring mode.';
    if (minRate.trim() && parsedMinRate === null) nextErrors.minRate = 'Enter a valid minimum rate.';
    if (maxRate.trim() && parsedMaxRate === null) nextErrors.maxRate = 'Enter a valid maximum rate.';
    if (parsedMinRate !== null && parsedMaxRate !== null && parsedMaxRate < parsedMinRate) {
      nextErrors.maxRate = 'Maximum rate must be at least the minimum rate.';
    }
    const contactError = contactValidationError(contactPreference, contactValue);
    if (contactError) nextErrors.contactValue = contactError;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      displayName: accountName.trim(),
      profilePhotoUrl: initial?.profilePhotoUrl ?? null,
      shortBio: shortBio.trim(),
      subjects: uniqueTags(subjects),
      gradeLevels: uniqueTags(gradeLevels),
      primarySubject: subjects[0] ?? '',
      gradeBand: gradeLevels[0] ?? '',
      city,
      province,
      barangaysServed: uniqueTags(barangaysServed),
      servesAllBarangays,
      areasServed: [],
      primaryMode,
      tutoringModes,
      rateFrom: parsedMinRate,
      minRate: parsedMinRate,
      maxRate: parsedMaxRate,
      education: education.trim(),
      experienceSummary: experienceSummary.trim(),
      contactPreference,
      contactValue: contactValue.trim(),
      isVisible,
    });
  }

  return (
    <View style={{ gap: theme.space[16] }}>
      <Card variant="raised">
        <SectionHeader title="Public introduction" />
        <View style={{ gap: theme.space[16] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
            <View style={{ flex: 1, gap: theme.space[4] }}>
              <Text token="bodyStrong">{accountName}</Text>
              <Text token="caption" color={theme.colors.textMuted}>{accountEmail}</Text>
            </View>
            <Chip variant="status" tone={isVisible ? 'success' : 'neutral'} label={isVisible ? 'Visible' : 'Hidden'} />
          </View>
          <TextField label="Short introduction" value={shortBio} onChangeText={setShortBio} placeholder="Tell parents how you help learners." multiline maxLength={500} showCounter />
          <TextField label="Education or credentials" value={education} onChangeText={setEducation} placeholder="BS Mathematics, licensed teacher" maxLength={160} />
          <TextField label="Tutoring experience" value={experienceSummary} onChangeText={setExperienceSummary} placeholder="5 years helping elementary learners" multiline maxLength={300} showCounter />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Subjects and grades" />
        <View style={{ gap: theme.space[12] }}>
          <Text token="caption" color={theme.colors.textSecondary}>Subjects</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {TUTOR_SUBJECTS.map((subject) => <Chip key={subject} label={subject} selected={subjects.some((item) => item.toLowerCase() === subject.toLowerCase())} onPress={() => toggleSubject(subject)} />)}
            {subjects.filter((subject) => !TUTOR_SUBJECTS.some((option) => option.toLowerCase() === subject.toLowerCase())).map((subject) => <Chip key={subject} label={subject} variant="removable" onRemove={() => setSubjects((current) => current.filter((item) => item !== subject))} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space[8] }}>
            <View style={{ flex: 1 }}><TextField label="Add another subject" value={subjectDraft} onChangeText={setSubjectDraft} placeholder="e.g. Chemistry" /></View>
            <Button label="Add" size="sm" variant="secondary" onPress={addSubject} />
          </View>
          {errors.subjects ? <Text token="caption" color={theme.colors.danger}>{errors.subjects}</Text> : null}

          <Text token="caption" color={theme.colors.textSecondary}>Grade levels</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {TUTOR_GRADE_LEVELS.map((gradeLevel) => <Chip key={gradeLevel} label={gradeLevel} selected={gradeLevels.includes(gradeLevel)} onPress={() => toggleGradeLevel(gradeLevel)} />)}
          </View>
          {errors.gradeLevels ? <Text token="caption" color={theme.colors.danger}>{errors.gradeLevels}</Text> : null}
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Location and rates" />
        <View style={{ gap: theme.space[16] }}>
          <LocationPicker
            label="City / municipality"
            value={city}
            options={TUTOR_HUNT_LOCATIONS.map((location) => location.city)}
            placeholder="Choose your city or municipality"
            error={errors.city}
            onChange={(value) => {
              if (typeof value !== 'string') return;
              const location = locationForCity(value);
              setCity(value);
              setProvince(location?.province ?? 'Leyte');
              setBarangaysServed([]);
              clearError('city');
            }}
          />
          {locationForCity(city) ? (
            <View style={{ gap: theme.space[12] }}>
              <View style={{ gap: theme.space[8] }}>
                <Text token="caption" color={theme.colors.textSecondary}>Barangays served</Text>
                <Chip label="All barangays in this municipality" selected={servesAllBarangays} onPress={() => setServesAllBarangays((current) => !current)} />
              </View>
              {!servesAllBarangays ? <LocationPicker label="Choose specific barangays" value={barangaysServed} options={locationForCity(city)?.barangays ?? []} placeholder="Select barangays" multiple error={errors.barangays} onChange={(value) => { if (Array.isArray(value)) { setBarangaysServed(value); clearError('barangays'); } }} /> : null}
              <Text token="caption" color={theme.colors.textMuted}>Province: {province}. Online tutors can leave the barangay coverage broad; face-to-face tutors should choose where they travel.</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.space[12] }}>
            <View style={{ flex: 1 }}><TextField label="Minimum rate" value={minRate} onChangeText={(value) => { setMinRate(value); clearError('minRate'); if (maxRate && parseRate(value) !== null && parseRate(maxRate) !== null && parseRate(value)! <= parseRate(maxRate)!) clearError('maxRate'); }} placeholder="350" keyboardType="decimal-pad" error={errors.minRate} /></View>
            <View style={{ flex: 1 }}><TextField label="Maximum rate" value={maxRate} onChangeText={(value) => { setMaxRate(value); clearError('maxRate'); }} placeholder="600" keyboardType="decimal-pad" error={errors.maxRate} /></View>
          </View>
          <Text token="caption" color={theme.colors.textMuted}>Rates are shown in Philippine pesos per hour.</Text>
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Tutoring modes" />
        <View style={{ gap: theme.space[12] }}>
          <Text token="caption" color={theme.colors.textSecondary}>Available modes</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {(Object.keys(TUTOR_MODE_LABELS) as TutoringMode[]).map((mode) => <Chip key={mode} label={TUTOR_MODE_LABELS[mode]} selected={tutoringModes.includes(mode)} onPress={() => toggleMode(mode)} />)}
          </View>
          {tutoringModes.length > 1 ? (
            <View style={{ gap: theme.space[8] }}>
              <Text token="caption" color={theme.colors.textSecondary}>Primary mode</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
                {tutoringModes.map((mode) => <Chip key={mode} label={TUTOR_MODE_LABELS[mode]} selected={primaryMode === mode} onPress={() => setPrimaryMode(mode)} />)}
              </View>
            </View>
          ) : null}
          {errors.tutoringModes ? <Text token="caption" color={theme.colors.danger}>{errors.tutoringModes}</Text> : null}
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Contact options" />
        <View style={{ gap: theme.space[12] }}>
          <Text token="caption" color={theme.colors.textSecondary}>Preferred contact method</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {CONTACT_OPTIONS.map((option) => <Chip key={option.value} label={option.label} selected={contactPreference === option.value} onPress={() => { setContactPreference(option.value); clearError('contactValue'); }} />)}
          </View>
          <TextField label="Contact detail" value={contactValue} onChangeText={(value) => { setContactValue(value); clearError('contactValue'); }} placeholder={contactPlaceholder(contactPreference, accountEmail)} helper={contactHelper(contactPreference)} error={errors.contactValue} />
          <Text token="caption" color={theme.colors.textMuted}>Only the contact detail you choose here is shown on your public profile.</Text>
        </View>
      </Card>

      <Card variant={isVisible ? 'accent' : 'flat'}>
        <View style={{ gap: theme.space[12] }}>
          <Text token="h3">{isVisible ? 'Your profile is visible' : 'Your profile is hidden'}</Text>
          <Text token="caption" color={theme.colors.textMuted}>
            {isVisible ? 'Parents will be able to find this profile when the marketplace opens.' : 'Save your profile privately, then make it visible when you are ready.'}
          </Text>
          <Button label={isVisible ? 'Hide public profile' : 'Make profile visible'} variant={isVisible ? 'secondary' : 'primary'} onPress={() => setIsVisible((current) => !current)} />
        </View>
      </Card>

      <Button label={submitLabel} onPress={handleSubmit} loading={busy} fullWidth />
    </View>
  );
}
