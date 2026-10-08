/**
 * Date field.
 *
 * A thin specialisation of TextField that speaks "YYYY-MM-DD" and hands the
 * parent a real Date. Deliberately dependency-free: the design plan's
 * component inventory lists a DateField, and a native picker
 * (@react-native-community/datetimepicker, which IS Expo Go compatible) should
 * replace the text entry later without changing this component's props.
 *
 * Dates are interpreted as Manila local midnight (blueprint section 41).
 */

import React, { useEffect, useState } from 'react';

import { formatIsoDate, parseIsoDate } from '@/utils/date';
import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  helper?: string;
  /** An error supplied by the form, e.g. "Birthday cannot be in the future." */
  error?: string | null;
  disabled?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  helper,
  error = null,
  disabled = false,
}: DateFieldProps) {
  const [text, setText] = useState(value ? formatIsoDate(value) : '');
  const [localError, setLocalError] = useState<string | null>(null);

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
