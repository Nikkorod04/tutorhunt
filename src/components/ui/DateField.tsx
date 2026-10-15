/**
 * Date field.
 *
 * A thin specialisation of TextField that speaks "YYYY-MM-DD" and hands the
 * parent a real Date. Native users select a date from the system picker; web
 * keeps the text fallback so the same form remains usable cross-platform.
 *
 * Dates are interpreted as Manila local midnight (blueprint section 41).
 */

import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { formatIsoDate, parseIsoDate } from '@/utils/date';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { DatePickerDialog } from './DatePickerDialog';
import { TextField } from './TextField';

type NativeDatePickerProps = {
  value: Date;
  mode: 'date';
  display: 'calendar' | 'spinner';
  maximumDate?: Date;
  onChange: (event: DateTimePickerEvent, selected?: Date) => void;
  accentColor?: string;
};

/**
 * An older development/production binary may not contain the native module
 * yet. Loading it defensively keeps that binary usable until it is rebuilt.
 */
let NativeDatePicker: React.ComponentType<NativeDatePickerProps> | null = null;
if (Platform.OS !== 'web') {
  try {
    // Optional runtime loading is intentional: old binaries may not have the
    // native module even though the JavaScript package is installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-community/datetimepicker') as {
      default?: React.ComponentType<NativeDatePickerProps>;
    };
    NativeDatePicker = module.default ?? null;
  } catch {
    NativeDatePicker = null;
  }
}

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  helper?: string;
  /** An error supplied by the form, e.g. "Birthday cannot be in the future." */
  error?: string | null;
  disabled?: boolean;
  /** Opens the picker with a latest allowed date, useful for birthdays. */
  maximumDate?: Date;
  /** Prevents manual date entry and uses the simple in-app calendar dialog. */
  pickerOnly?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  helper,
  error = null,
  disabled = false,
  maximumDate,
  pickerOnly = false,
}: DateFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(value ? formatIsoDate(value) : '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Keep in step when the parent sets or clears the value from outside.
  useEffect(() => {
    const parsed = parseIsoDate(text);
    const sameAsValue = (parsed?.getTime() ?? null) === (value?.getTime() ?? null);
    if (!sameAsValue) {
      setText(value ? formatIsoDate(value) : '');
      setLocalError(null);
    }
    // Intentionally keyed on `value` only: including `text` would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(next: string) {
    setText(next);

    if (next.trim().length === 0) {
      setLocalError(null);
      onChange(null);
      return;
    }

    const parsed = parseIsoDate(next);
    if (!parsed) {
      setLocalError('Use YYYY-MM-DD, for example 2016-05-02.');
      return;
    }

    setLocalError(null);
    onChange(parsed);
  }

  function handlePickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') setPickerOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    setText(formatIsoDate(selected));
    setLocalError(null);
    onChange(selected);
  }

  const pickerEnabled = Platform.OS !== 'web' && NativeDatePicker !== null;

  if (pickerOnly) {
    return (
      <View>
        <TextField
          label={label}
          value={value ? formatIsoDate(value) : ''}
          placeholder="Select a date"
          helper={helper}
          error={error}
          disabled={disabled}
          readOnly
          onPress={() => setPickerOpen(true)}
          icon="calendar-outline"
        />
        <DatePickerDialog
          visible={pickerOpen}
          value={value ?? new Date()}
          maximumDate={maximumDate}
          onClose={() => setPickerOpen(false)}
          onSelect={(date) => {
            setPickerOpen(false);
            onChange(date);
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <TextField
        label={label}
        value={text}
        onChangeText={pickerEnabled ? undefined : handleChange}
        placeholder={placeholder}
        helper={helper}
        error={error ?? localError}
        disabled={disabled}
        readOnly={pickerEnabled}
        onPress={pickerEnabled ? () => setPickerOpen(true) : undefined}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        icon="calendar-outline"
      />
      {pickerOpen ? (
        <View style={{ gap: theme.space[8], alignItems: 'flex-start' }}>
          {NativeDatePicker ? <NativeDatePicker
            value={value ?? new Date()}
            mode="date"
            display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
            maximumDate={maximumDate}
            onChange={handlePickerChange}
            accentColor={theme.colors.primary}
          /> : null}
          {Platform.OS === 'ios' ? <Button label="Done" size="sm" variant="secondary" onPress={() => setPickerOpen(false)} /> : null}
        </View>
      ) : null}
    </View>
  );
}
