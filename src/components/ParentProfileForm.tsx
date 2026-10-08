import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, SectionHeader, Text, TextField } from '@/components/ui';
import { LocationPicker } from '@/components/LocationPicker';
import { CONTACT_PREFERENCE_LABELS } from '@/constants/tutorProfile';
import { locationForCity, TUTOR_HUNT_LOCATIONS, type ServiceProvince } from '@/constants/locations';
import type { ParentProfile, ContactPreference } from '@/types';
import type { ParentProfileInput } from '@/services/parentProfiles.service';
import { contactHelper, contactPlaceholder, contactValidationError } from '@/utils/contact';
import { useTheme } from '@/theme';

const CONTACT_OPTIONS: ContactPreference[] = ['messenger', 'facebook', 'phone', 'email'];

interface ParentProfileFormProps {
  accountName: string;
  accountEmail: string;
  initial?: ParentProfile | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: ParentProfileInput) => void;
}

export function ParentProfileForm({ accountName, accountEmail, initial = null, submitLabel, busy = false, onSubmit }: ParentProfileFormProps) {
  const theme = useTheme();
  const [city, setCity] = useState(initial?.city ?? '');
  const [province, setProvince] = useState<ServiceProvince>(initial?.province ?? locationForCity(initial?.city)?.province ?? 'Leyte');
  const [barangay, setBarangay] = useState(initial?.barangay ?? '');
  const [contactPreference, setContactPreference] = useState<ContactPreference>(initial?.contactPreference ?? 'messenger');
  const [contactValue, setContactValue] = useState(initial?.contactValue ?? '');
  const [contactVisible, setContactVisible] = useState(initial?.contactVisible ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(field: string) {
    setErrors((current) => current[field] ? { ...current, [field]: '' } : current);
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!city.trim()) nextErrors.city = 'A city is required.';
    const contactError = contactValidationError(contactPreference, contactValue);
    if (contactError) nextErrors.contactValue = contactError;
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({
      displayName: accountName.trim(),
      city: city.trim(),
      province,
      barangay: barangay.trim(),
      contactPreference,
      contactValue: contactValue.trim(),
      contactVisible,
    });
  }

  return (
    <View style={{ gap: theme.space[16] }}>
      <Card variant="raised">
        <SectionHeader title="Your profile" />
        <View style={{ gap: theme.space[12] }}>
          <View style={{ gap: theme.space[4] }}>
            <Text token="bodyStrong">{accountName}</Text>
            <Text token="caption" color={theme.colors.textMuted}>{accountEmail}</Text>
          </View>
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
              setBarangay('');
              clearError('city');
            }}
          />
          {locationForCity(city) ? <LocationPicker label="Barangay (optional)" value={barangay} options={locationForCity(city)?.barangays ?? []} placeholder="Choose your barangay" helper="Optional for privacy; your municipality is enough to find nearby tutors." onChange={(value) => { if (typeof value === 'string') setBarangay(value); }} /> : null}
          <Text token="caption" color={theme.colors.textMuted}>Service area: {province}. Your city helps us show tutors who are nearby.</Text>
        </View>
      </Card>

      <Card variant="raised">
        <SectionHeader title="Contact preference" />
        <View style={{ gap: theme.space[12] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
            {CONTACT_OPTIONS.map((option) => (
              <Chip key={option} label={CONTACT_PREFERENCE_LABELS[option]} selected={contactPreference === option} onPress={() => { setContactPreference(option); clearError('contactValue'); }} />
            ))}
          </View>
          <TextField
            label="Contact detail"
            value={contactValue}
            onChangeText={(value) => { setContactValue(value); clearError('contactValue'); }}
            placeholder={contactPlaceholder(contactPreference, accountEmail)}
            helper={contactHelper(contactPreference)}
            error={errors.contactValue}
          />
        </View>
      </Card>

      <Card variant={contactVisible ? 'accent' : 'flat'}>
        <View style={{ gap: theme.space[12] }}>
          <Text token="h3">{contactVisible ? 'Contact is visible' : 'Contact stays private'}</Text>
          <Text token="caption" color={theme.colors.textMuted}>
            {contactVisible ? 'Tutors can see this contact detail when you interact with them.' : 'Keep it private until you are ready to share it.'}
          </Text>
          <Button label={contactVisible ? 'Keep contact private' : 'Show contact to tutors'} variant={contactVisible ? 'secondary' : 'primary'} onPress={() => setContactVisible((value) => !value)} />
        </View>
      </Card>

      <Button label={submitLabel} onPress={handleSubmit} loading={busy} fullWidth />
    </View>
  );
}
