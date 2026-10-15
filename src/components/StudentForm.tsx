/**
 * Student form, shared by the add and edit screens.
 *
 * Validation comes entirely from utils/validation.ts so the rules live in one
 * place and are unit tested; this component only renders the messages.
 */

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, View, type TextInput } from 'react-native';

import { Avatar, Button, Card, Chip, DateField, SectionHeader, Text, TextField } from '@/components/ui';
import { STUDENT_AVATARS } from '@/constants/avatars';
import type { StudentInput } from '@/services/students.service';
import { useTheme } from '@/theme';
import type { RateType, Student, StudentAvatarId, StudentGender } from '@/types';
import {
  issuesByField,
  LIMITS,
  parseRate,
  validateStudent,
  type StudentFormValues,
} from '@/utils/validation';

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
    gender: student?.gender ?? null,
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

function initialAvatarId(student?: Student | null): StudentAvatarId {
  if (!student) return 'default';
  if (student.avatarType === 'boy') return 'male-01';
  if (student.avatarType === 'girl') return 'female-01';
  if (student.avatarType === 'neutral') return 'default';
  return student.avatarType;
}

export function StudentForm({
  initial = null,
  submitLabel,
  busy = false,
  onSubmit,
}: StudentFormProps) {
  const theme = useTheme();
  const [values, setValues] = useState<StudentFormValues>(() => toFormValues(initial));
  const [avatarType, setAvatarType] = useState<StudentAvatarId>(() => initialAvatarId(initial));
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [customAvatarMimeType, setCustomAvatarMimeType] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nicknameRef = useRef<TextInput>(null);
  const schoolRef = useRef<TextInput>(null);
  const gradeLevelRef = useRef<TextInput>(null);
  const parentNameRef = useRef<TextInput>(null);
  const parentContactRef = useRef<TextInput>(null);
  const tutoringPlaceRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

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

    if (!values.gender) return;

    const parsedRate = parseRate(values.defaultRate) ?? 0;

    onSubmit({
      nickname: values.nickname.trim(),
      gender: values.gender,
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
        <View style={{ gap: theme.space[16] }}>
          {initial ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.space[12],
                paddingBottom: theme.space[4],
              }}
            >
              <Avatar
                builtin={avatarType === 'custom' ? undefined : avatarType}
                imageUrl={customAvatarUri ?? initial.customAvatarUrl}
                name={values.nickname}
                size="lg"
              />
              <View style={{ flex: 1 }}>
                <Button
                  label="Change avatar"
                  icon="image-outline"
                  variant="secondary"
                  onPress={() => {
                    if (values.gender) setAvatarType(values.gender === 'male' ? 'male-01' : 'female-01');
                    void pickAvatar();
                  }}
                  fullWidth
                />
              </View>
            </View>
          ) : null}

          <Text token="h3">Student details</Text>
          <TextField
            label="Nickname"
            value={values.nickname}
            onChangeText={(v) => update('nickname', v)}
            placeholder="Ana"
            autoCapitalize="words"
            icon="person-outline"
            inputRef={nicknameRef}
            returnKeyType="next"
            onSubmitEditing={() => schoolRef.current?.focus()}
            maxLength={LIMITS.nickname}
            showCounter
            error={errors.nickname}
          />

          <View style={{ gap: theme.space[8] }}>
            <Text token="caption" color={theme.colors.textSecondary}>Gender</Text>
            <View
              style={{
                flexDirection: 'row',
                gap: theme.space[4],
                padding: theme.space[4],
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surfaceSunken,
              }}
            >
              {(['male', 'female'] as StudentGender[]).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option === 'male' ? 'Male' : 'Female'}
                  accessibilityState={{ selected: values.gender === option }}
                  onPress={() => {
                    update('gender', option);
                    if (avatarType !== 'custom' && !avatarType.startsWith(`${option}-`)) {
                      setAvatarType('default');
                    }
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: theme.radius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.space[8],
                    backgroundColor: values.gender === option ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Ionicons
                    name={option === 'male' ? 'male-outline' : 'female-outline'}
                    size={20}
                    color={values.gender === option ? theme.colors.textOnPrimary : theme.colors.textSecondary}
                  />
                  <Text token="bodyStrong" color={values.gender === option ? theme.colors.textOnPrimary : theme.colors.textPrimary}>
                    {option === 'male' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.gender ? <Text token="caption" color={theme.colors.dangerText}>{errors.gender}</Text> : null}
          </View>

          {values.gender ? (
            <View style={{ gap: theme.space[8] }}>
              <Text token="caption" color={theme.colors.textSecondary}>Choose avatar</Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.space[8],
                  padding: theme.space[12],
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.primarySubtle,
                }}
              >
                {STUDENT_AVATARS[values.gender].map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setAvatarType(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${option.gender} avatar ${option.id.slice(-2)}`}
                    accessibilityState={{ selected: avatarType === option.id }}
                    style={{
                      width: '30%',
                      minHeight: 84,
                      alignItems: 'center',
                      gap: theme.space[4],
                      paddingVertical: theme.space[4],
                      borderRadius: theme.radius.md,
                      borderWidth: avatarType === option.id ? 2 : 1,
                      borderColor: avatarType === option.id ? theme.colors.primary : theme.colors.borderSubtle,
                      backgroundColor: avatarType === option.id ? theme.colors.surface : 'rgba(255,255,255,0.68)',
                    }}
                  >
                    <Avatar builtin={option.id} size="md" />
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => void pickAvatar()}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a custom avatar"
                  accessibilityState={{ selected: avatarType === 'custom' }}
                  style={{
                      width: '30%',
                      minHeight: 84,
                    alignItems: 'center',
                    gap: theme.space[4],
                      paddingVertical: theme.space[4],
                    borderRadius: theme.radius.md,
                    borderWidth: avatarType === 'custom' ? 2 : 1,
                    borderColor: avatarType === 'custom' ? theme.colors.primary : theme.colors.borderSubtle,
                      backgroundColor: avatarType === 'custom' ? theme.colors.surface : 'rgba(255,255,255,0.68)',
                  }}
                >
                  <Avatar
                    name={values.nickname}
                    imageUrl={customAvatarUri ?? initial?.customAvatarUrl}
                    builtin={customAvatarUri || initial?.customAvatarUrl ? undefined : 'default'}
                    size="md"
                  />
                  <Text token="caption" color={theme.colors.textSecondary}>Custom</Text>
                </Pressable>
              </View>
              {avatarType === 'custom' ? (
                <Button
                  label={customAvatarUri || initial?.customAvatarUrl ? 'Change custom photo' : 'Choose custom photo'}
                  variant="secondary"
                  size="sm"
                  icon="image-outline"
                  onPress={() => void pickAvatar()}
                />
              ) : null}
              <Text token="caption" color={theme.colors.textMuted}>
                Built-in avatars keep a child&apos;s photo out of the database. If no avatar is chosen, the default avatar is used.
              </Text>
            </View>
          ) : null}

          <DateField
            label="Birthday"
            value={values.birthday}
            onChange={(date) => update('birthday', date)}
            helper="Optional. Age is calculated from this and never stored."
            error={errors.birthday}
            maximumDate={new Date()}
            pickerOnly
          />

          <TextField
            label="School"
            value={values.school}
            onChangeText={(v) => update('school', v)}
            placeholder="Tacloban City Central School"
            autoCapitalize="words"
            icon="school-outline"
            inputRef={schoolRef}
            returnKeyType="next"
            onSubmitEditing={() => gradeLevelRef.current?.focus()}
            maxLength={LIMITS.school}
            error={errors.school}
          />
          <TextField
            label="Grade level"
            value={values.gradeLevel}
            onChangeText={(v) => update('gradeLevel', v)}
            placeholder="Grade 5"
            icon="layers-outline"
            inputRef={gradeLevelRef}
            returnKeyType="next"
            onSubmitEditing={() => parentNameRef.current?.focus()}
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
            inputRef={parentNameRef}
            returnKeyType="next"
            onSubmitEditing={() => parentContactRef.current?.focus()}
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
            inputRef={parentContactRef}
            returnKeyType="next"
            onSubmitEditing={() => tutoringPlaceRef.current?.focus()}
            maxLength={LIMITS.parentContact}
            helper="Private. Never shown in the marketplace."
            error={errors.parentContact}
          />
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Place and Rate" />
        <View style={{ gap: theme.space[16] }}>
          <TextField
            label="Tutoring place"
            value={values.tutoringPlace}
            onChangeText={(v) => update('tutoringPlace', v)}
            placeholder="Student's home"
            icon="location-outline"
            inputRef={tutoringPlaceRef}
            returnKeyType="next"
            onSubmitEditing={() => rateRef.current?.focus()}
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
            inputRef={rateRef}
            returnKeyType="next"
            onSubmitEditing={() => notesRef.current?.focus()}
            error={errors.defaultRate}
          />
        </View>
      </Card>

      <Card variant="raised">
        <TextField
          label="Notes"
          inputRef={notesRef}
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
