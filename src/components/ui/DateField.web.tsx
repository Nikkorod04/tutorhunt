/** Web fallback for DateField. Native builds use the system date picker. */

import React, { useEffect, useState } from 'react';

import { formatIsoDate, parseIsoDate } from '@/utils/date';
import { DatePickerDialog } from './DatePickerDialog';
import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
  maximumDate?: Date;
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
  const [text, setText] = useState(value ? formatIsoDate(value) : '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const parsed = parseIsoDate(text);
    const sameAsValue = (parsed?.getTime() ?? null) === (value?.getTime() ?? null);
    if (!sameAsValue) {
      setText(value ? formatIsoDate(value) : '');
      setLocalError(null);
    }
    // Intentionally keyed on value only: including text would loop.
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

  if (pickerOnly) {
    return (
      <>
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
      </>
    );
  }

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={handleChange}
      placeholder={placeholder}
      helper={helper}
      error={error ?? localError}
      disabled={disabled}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      icon="calendar-outline"
    />
  );
}
