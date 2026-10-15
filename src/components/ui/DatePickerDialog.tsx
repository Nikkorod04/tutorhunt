import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { formatDisplayDate, formatIsoDate, manilaParts, parseIsoDate } from '@/utils/date';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface DatePickerDialogProps {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  title?: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const PICKER_STEPS = ['year', 'month', 'day'] as const;
type PickerStep = (typeof PICKER_STEPS)[number];

function monthDate(year: number, month: number): Date {
  return parseIsoDate(`${year}-${String(month + 1).padStart(2, '0')}-01`) ?? new Date();
}

function shiftMonth(date: Date, amount: number): Date {
  const { year, month } = manilaParts(date);
  const next = new Date(Date.UTC(year, month + amount, 1));
  return monthDate(next.getUTCFullYear(), next.getUTCMonth());
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function dateForDay(year: number, month: number, day: number): Date {
  const safeDay = Math.min(day, daysInMonth(year, month));
  return parseIsoDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`)
    ?? monthDate(year, month);
}

function isAfterMonth(year: number, month: number, maximumDate: Date): boolean {
  const maximum = manilaParts(maximumDate);
  return year > maximum.year || (year === maximum.year && month > maximum.month);
}

export function DatePickerDialog({
  visible,
  value,
  maximumDate,
  title = 'Choose date',
  onSelect,
  onClose,
}: DatePickerDialogProps) {
  const theme = useTheme();
  const [viewDate, setViewDate] = useState(value);
  const [draftDate, setDraftDate] = useState(value);
  const [step, setStep] = useState<PickerStep>('year');

  useEffect(() => {
    if (visible) {
      setViewDate(value);
      setDraftDate(value);
      setStep('year');
    }
  }, [value, visible]);

  const { year, month, day: selectedDay } = manilaParts(draftDate);
  const viewParts = manilaParts(viewDate);
  const firstWeekday = new Date(Date.UTC(viewParts.year, viewParts.month, 1)).getUTCDay();
  const dayCount = daysInMonth(viewParts.year, viewParts.month);
  const cells = Array.from({ length: firstWeekday + dayCount }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  const currentYear = manilaParts(new Date()).year;
  const maximumYear = maximumDate
    ? manilaParts(maximumDate).year
    : Math.max(currentYear + 10, year);
  const minimumYear = Math.min(1900, year);
  const years = Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => minimumYear + index);

  function isDisabled(dayNumber: number): boolean {
    if (!maximumDate) return false;
    const candidate = monthDate(viewParts.year, viewParts.month);
    const parsed = parseIsoDate(`${formatIsoDate(candidate).slice(0, 8)}${String(dayNumber).padStart(2, '0')}`);
    return !parsed || parsed.getTime() > maximumDate.getTime();
  }

  function chooseYear(nextYear: number): void {
    const nextDate = dateForDay(nextYear, month, selectedDay);
    setDraftDate(nextDate);
    setViewDate(nextDate);
    setStep('month');
  }

  function chooseMonth(nextMonth: number): void {
    const nextDate = dateForDay(year, nextMonth, selectedDay);
    setDraftDate(nextDate);
    setViewDate(nextDate);
    setStep('day');
  }

  const nextMonthDate = shiftMonth(viewDate, 1);
  const nextMonthParts = manilaParts(nextMonthDate);
  const nextMonthDisabled = maximumDate
    ? isAfterMonth(nextMonthParts.year, nextMonthParts.month, maximumDate)
    : false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', padding: theme.space[20] }} pointerEvents="box-none">
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.48)' }} />
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.space[16], gap: theme.space[16], ...theme.elevation.e3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: theme.space[4] }}>
              <Text token="h3">{title}</Text>
              <Text token="caption" color={theme.colors.textMuted}>{formatDisplayDate(draftDate)}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close date picker" hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.space[8], padding: theme.space[4], borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSunken }}>
            {PICKER_STEPS.map((pickerStep) => {
              const active = step === pickerStep;
              return (
                <Pressable
                  key={pickerStep}
                  onPress={() => setStep(pickerStep)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Choose ${pickerStep}`}
                  style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, backgroundColor: active ? theme.colors.primary : 'transparent' }}
                >
                  <Text token="caption" color={active ? theme.colors.textOnPrimary : theme.colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                    {pickerStep}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {step === 'year' ? (
            <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space[8] }}>
              {years.map((optionYear) => {
                const selected = optionYear === year;
                return (
                  <View key={optionYear} style={{ width: '33.3333%', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => chooseYear(optionYear)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Year ${optionYear}`}
                      style={{ width: '92%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceSunken }}
                    >
                      <Text token="body" color={selected ? theme.colors.textOnPrimary : theme.colors.textPrimary}>{optionYear}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {step === 'month' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space[8] }}>
              {MONTHS.map((monthName, monthIndex) => {
                const selected = monthIndex === month;
                const disabled = maximumDate ? isAfterMonth(year, monthIndex, maximumDate) : false;
                return (
                  <View key={monthName} style={{ width: '33.3333%', alignItems: 'center' }}>
                    <Pressable
                      disabled={disabled}
                      onPress={() => chooseMonth(monthIndex)}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={`${monthName} ${year}`}
                      style={{ width: '92%', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: disabled ? theme.colors.surfaceSunken : selected ? theme.colors.primary : theme.colors.surfaceSunken, opacity: disabled ? 0.45 : 1 }}
                    >
                      <Text token="caption" color={disabled ? theme.colors.textHint : selected ? theme.colors.textOnPrimary : theme.colors.textPrimary}>{monthName.slice(0, 3)}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          {step === 'day' ? (
            <View style={{ gap: theme.space[8] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setViewDate((current) => shiftMonth(current, -1))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySubtle }}>
                  <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                </Pressable>
                <Text token="bodyStrong">{MONTHS[viewParts.month]} {viewParts.year}</Text>
                <Pressable disabled={nextMonthDisabled} onPress={() => setViewDate(nextMonthDate)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySubtle, opacity: nextMonthDisabled ? 0.45 : 1 }}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row' }}>
                {WEEKDAYS.map((weekday, index) => <View key={`${weekday}-${index}`} style={{ width: '14.2857%', alignItems: 'center' }}><Text token="caption" color={theme.colors.textMuted}>{weekday}</Text></View>)}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space[4] }}>
                {cells.map((dayNumber, index) => {
                  if (dayNumber === null) return <View key={`blank-${index}`} style={{ width: '14.2857%', height: 44 }} />;
                  const selected = viewParts.year === year && viewParts.month === month && dayNumber === selectedDay;
                  const disabled = isDisabled(dayNumber);
                  return (
                    <View key={`day-${dayNumber}`} style={{ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Pressable
                        disabled={disabled}
                        onPress={() => {
                          const selectedDate = parseIsoDate(`${viewParts.year}-${String(viewParts.month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`);
                          if (selectedDate) setDraftDate(selectedDate);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${MONTHS[viewParts.month]} ${dayNumber}, ${viewParts.year}`}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: selected ? theme.colors.primary : 'transparent' }}
                      >
                        <Text token="body" color={disabled ? theme.colors.textHint : selected ? theme.colors.textOnPrimary : theme.colors.textPrimary}>{dayNumber}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
            <View style={{ flex: 1 }}><Button label="Cancel" variant="secondary" fullWidth onPress={onClose} /></View>
            <View style={{ flex: 1 }}><Button label="Choose date" fullWidth disabled={step !== 'day'} onPress={() => onSelect(draftDate)} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
