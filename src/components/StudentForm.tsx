/**
 * Student form, shared by the add and edit screens.
 *
 * Validation comes entirely from utils/validation.ts so the rules live in one
 * place and are unit tested; this component only renders the messages.
 */

import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { Avatar, Button, Card, Chip, DateField, SectionHeader, Text, TextField } from '@/components/ui';
import type { IconName } from '@/components/ui';
import type { StudentInput } from '@/services/students.service';
import { useTheme } from '@/theme';
import type { AvatarType, RateType, Student } from '@/types';
import {
  issuesByField,
  LIMITS,
  parseRate,
  validateStudent,
  type StudentFormValues,
} from '@/utils/validation';

const AVATARS: { value: AvatarType; label: string; icon: IconName }[] = [
  { value: 'boy', label: 'Boy', icon: 'happy-outline' },
  { value: 'girl', label: 'Girl', icon: 'flower-outline' },
  { value: 'neutral', label: 'Neutral', icon: 'person-outline' },
  { value: 'custom', label: 'Photo', icon: 'image-outline' },
];

const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'hourly', label: 'Per hour' },
  { value: 'per_session', label: 'Per session' },
];

export interface StudentFormProps {
  initial?: Student | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: StudentInput) => void;
}

function toFormValues(student?: Student | null): StudentFormValues {
  return {
    nickname: student?.nickname ?? '',
    birthday: student?.birthday ?? null,
    school: student?.school ?? '',
    gradeLevel: student?.gradeLevel ?? '',
    parentGuardianName: student?.parentGuardianName ?? '',
    parentContact: student?.parentContact ?? '',
    tutoringPlace: student?.tutoringPlace ?? '',
    defaultRate: student?.defaultRate ? String(student.defaultRate) : '',
    rateType: student?.rateType ?? 'hourly',
    notes: student?.notes ?? '',
  };
}

export function StudentForm({
  initial = null,
  submitLabel,
  busy = false,
  onSubmit,
}: StudentFormProps) {
  const theme = useTheme();
  const [values, setValues] = useState<StudentFormValues>(() => toFormValues(initial));
  const [avatarType, setAvatarType] = useState<AvatarType>(initial?.avatarType ?? 'neutral');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [customAvatarMimeType, setCustomAvatarMimeType] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a custom student avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Photo is too large', 'Choose a photo smaller than 5 MB.');
      return;
    }

    setAvatarType('custom');
    setCustomAvatarUri(asset.uri);
    setCustomAvatarMimeType(asset.mimeType ?? 'image/jpeg');
  }

  function update<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the field's error as soon as the tutor edits it.
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function handleSubmit() {
    const issues = validateStudent(values);
    const byField = issuesByField(issues);

    if (issues.length > 0) {
      setErrors(byField);
      return;
    }

    const parsedRate = parseRate(values.defaultRate) ?? 0;

    onSubmit({
      nickname: values.nickname.trim(),
      avatarType,
      customAvatarUrl: avatarType === 'custom' ? initial?.customAvatarUrl ?? null : null,
      customAvatarLocalUri: avatarType === 'custom' ? customAvatarUri : null,
      customAvatarMimeType: avatarType === 'custom' ? customAvatarMimeType : null,
      birthday: values.birthday,
      school: values.school.trim(),
      gradeLevel: values.gradeLevel.trim(),
      parentGuardianName: values.parentGuardianName.trim(),
      parentContact: values.parentContact.trim(),
      tutoringPlace: values.tutoringPlace.trim(),
      rateType: values.rateType,
      defaultRate: parsedRate,
      notes: values.notes.trim(),
    });
  }

  return (
    <View style={{ gap: theme.space[24] }}>
      <Card variant="raised">
        <SectionHeader title="Student" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Nickname"
            value={values.nickname}
            onChangeText={(v) => update('nickname', v)}
            placeholder="Ana"
            autoCapitalize="words"
            icon="person-outline"
            maxLength={LIMITS.nickname}
            showCounter
            error={errors.nickname}
          />

          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>
              Avatar
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
              {AVATARS.map((option) => (
                <Chip
                  key={option.value}
                  variant="filter"
                  label={option.label}
                  icon={option.icon}
                  selected={avatarType === option.value}
                  onPress={() => {
                    if (option.value === 'custom') {
                      void pickAvatar();
                    } else {
                      setAvatarType(option.value);
                    }
                  }}
                />
              ))}
            </View>
            {avatarType === 'custom' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[12] }}>
                <Avatar
                  name={values.nickname}
                  imageUrl={customAvatarUri ?? initial?.customAvatarUrl}
                  size="lg"
                />
                <Button
                  label={customAvatarUri || initial?.customAvatarUrl ? 'Change photo' : 'Choose photo'}
                  variant="secondary"
                  size="sm"
                  icon="image-outline"
                  onPress={() => void pickAvatar()}
                />
              </View>
            ) : null}
            <Text token="caption" color={theme.colors.textMuted}>
              Built-in avatars keep a child&apos;s photo out of the database.
            </Text>
          </View>

          <DateField
            label="Birthday"
            value={values.birthday}
            onChange={(date) => update('birthday', date)}
            helper="Optional. Age is calculated from this and never stored."
            error={errors.birthday}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="School" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="School"
            value={values.school}
            onChangeText={(v) => update('school', v)}
            placeholder="Tacloban City Central School"
            autoCapitalize="words"
            icon="school-outline"
            maxLength={LIMITS.school}
            error={errors.school}
          />
          <TextField
            label="Grade level"
            value={values.gradeLevel}
            onChangeText={(v) => update('gradeLevel', v)}
            placeholder="Grade 5"
            icon="layers-outline"
            maxLength={LIMITS.gradeLevel}
            error={errors.gradeLevel}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Parent or guardian" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Name"
            value={values.parentGuardianName}
            onChangeText={(v) => update('parentGuardianName', v)}
            placeholder="Maria Santos"
            autoCapitalize="words"
            icon="people-outline"
            maxLength={LIMITS.parentGuardianName}
            error={errors.parentGuardianName}
          />
          <TextField
            label="Contact"
            value={values.parentContact}
            onChangeText={(v) => update('parentContact', v)}
            placeholder="0917 000 0000"
            keyboardType="phone-pad"
            icon="call-outline"
            maxLength={LIMITS.parentContact}
            helper="Private. Never shown in the marketplace."
            error={errors.parentContact}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Tutoring" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Tutoring place"
            value={values.tutoringPlace}
            onChangeText={(v) => update('tutoringPlace', v)}
            placeholder="Student's home"
            icon="location-outline"
            maxLength={LIMITS.tutoringPlace}
            error={errors.tutoringPlace}
          />

          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>
              Rate type
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              {RATE_TYPES.map((option) => (
                <Chip
                  key={option.value}
                  variant="filter"
                  label={option.label}
                  selected={values.rateType === option.value}
                  onPress={() => update('rateType', option.value)}
                />
              ))}
            </View>
          </View>

          <TextField
            label={values.rateType === 'hourly' ? 'Rate per hour' : 'Rate per session'}
            value={values.defaultRate}
            onChangeText={(v) => update('defaultRate', v)}
            placeholder="350"
            keyboardType="decimal-pad"
            icon="cash-outline"
            error={errors.defaultRate}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Notes" />
        <TextField
          label="Notes"
          value={values.notes}
          onChangeText={(v) => update('notes', v)}
          placeholder="Anything worth remembering about this student."
          multiline
          maxLength={LIMITS.notes}
          showCounter
          error={errors.notes}
        />
      </Card>

      <Button label={submitLabel} onPress={handleSubmit} loading={busy} fullWidth />
    </View>
  );
}
