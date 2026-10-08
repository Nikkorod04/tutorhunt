import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Card, Chip, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';

interface LocationPickerProps {
  label: string;
  value: string | string[];
  options: string[];
  placeholder: string;
  onChange: (value: string | string[]) => void;
  error?: string | null;
  helper?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function LocationPicker({
  label,
  value,
  options,
  placeholder,
  onChange,
  error,
  helper,
  multiple = false,
  disabled = false,
}: LocationPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const filteredOptions = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return normalized ? options.filter((option) => option.toLowerCase().includes(normalized)) : options;
  }, [options, search]);

  const displayValue = values.length === 0
    ? placeholder
    : multiple && values.length > 1
      ? `${values.length} barangays selected`
      : values[0];

  function select(option: string) {
    if (multiple) {
      const next = values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
      onChange(next);
      return;
    }
    onChange(option);
    setSearch('');
    setOpen(false);
  }

  return (
    <View style={{ gap: theme.space[4] }}>
      <Text token="caption" color={theme.colors.textSecondary}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space[8],
          paddingHorizontal: theme.space[12],
          borderRadius: theme.radius.md,
          borderWidth: error || open ? 2 : 0.5,
          borderColor: error ? theme.colors.danger : open ? theme.colors.borderFocus : theme.colors.borderDefault,
          backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
        })}
      >
        <Text token="body" color={values.length > 0 ? theme.colors.textPrimary : theme.colors.textHint} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textHint} />
      </Pressable>

      {error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : helper ? <Text token="caption" color={theme.colors.textMuted}>{helper}</Text> : null}

      {multiple && values.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[8] }}>
          {values.map((item) => <Chip key={item} label={item} variant="removable" onRemove={() => select(item)} />)}
        </View>
      ) : null}

      {open ? (
        <Card variant="raised" padded={false} style={{ overflow: 'hidden' }}>
          <View style={{ padding: theme.space[12], gap: theme.space[8] }}>
            <TextField label="Search options" value={search} onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}`} icon="search-outline" />
            <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator>
              {filteredOptions.length > 0 ? filteredOptions.map((option) => {
                const selected = values.includes(option);
                return (
                  <Pressable
                    key={option}
                    onPress={() => select(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: theme.space[8],
                      borderRadius: theme.radius.sm,
                      backgroundColor: pressed || selected ? theme.colors.primarySubtle : 'transparent',
                    })}
                  >
                    <Text token="body" color={selected ? theme.colors.primary : theme.colors.textPrimary}>{option}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                  </Pressable>
                );
              }) : <Text token="caption" color={theme.colors.textMuted}>No matching options.</Text>}
            </ScrollView>
            {multiple ? <Pressable onPress={() => { setOpen(false); setSearch(''); }} accessibilityRole="button" style={{ alignSelf: 'flex-end', padding: theme.space[8] }}><Text token="bodyStrong" color={theme.colors.primary}>Done</Text></Pressable> : null}
          </View>
        </Card>
      ) : null}
    </View>
  );
}
