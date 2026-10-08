import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import {
  formatDisplayDate,
  formatIsoDate,
  manilaParts,
  parseIsoDate,
} from '@/utils/date';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface CalendarDay {
  date: Date;
  key: string;
}

export interface ExpenseDateCalendarProps {
  selectedDates: Date[];
  onToggleDate: (date: Date) => void;
  error?: string;
}

function monthStart(date: Date): Date {
  const parts = manilaParts(date);
  return parseIsoDate(
    `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-01`,
  ) ?? date;
}

function shiftMonth(date: Date, amount: number): Date {
  const parts = manilaParts(date);
  const shifted = new Date(Date.UTC(parts.year, parts.month + amount, 1));
  return parseIsoDate(
    `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`,
  ) ?? date;
}

function calendarDays(month: Date): CalendarDay[] {
  const parts = manilaParts(month);
  const firstWeekday = new Date(Date.UTC(parts.year, parts.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(parts.year, parts.month + 1, 0)).getUTCDate();
  const days: CalendarDay[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push({ date: new Date(0), key: `empty-${index}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = parseIsoDate(
      `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
    if (date) days.push({ date, key: formatIsoDate(date) });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: new Date(0), key: `empty-${days.length}` });
  }

  return days;
}

export function ExpenseDateCalendar({
  selectedDates,
  onToggleDate,
  error,
}: ExpenseDateCalendarProps) {
  const theme = useTheme();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(selectedDates[0] ?? new Date()),
  );
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const selectedKeys = useMemo(
    () => new Set(selectedDates.map((date) => formatIsoDate(date))),
    [selectedDates],
  );
  const todayKey = formatIsoDate(new Date());
  const monthParts = manilaParts(visibleMonth);

  return (
    <View style={{ gap: theme.space[12] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          icon="chevron-back"
          variant="tonal"
          accessibilityLabel="Previous month"
          onPress={() => setVisibleMonth((current) => shiftMonth(current, -1))}
        />
        <Text token="bodyStrong">
          {MONTH_NAMES[monthParts.month]} {monthParts.year}
        </Text>
        <IconButton
          icon="chevron-forward"
          variant="tonal"
          accessibilityLabel="Next month"
          onPress={() => setVisibleMonth((current) => shiftMonth(current, 1))}
        />
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={{ width: '14.2857%', alignItems: 'center' }}>
            <Text token="caption" color={theme.colors.textMuted}>{weekday}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((item) => {
          if (item.date.getTime() === 0) {
            return <View key={item.key} style={{ width: '14.2857%', height: 44 }} />;
          }

          const selected = selectedKeys.has(item.key);
          const today = item.key === todayKey;

          return (
            <Pressable
              key={item.key}
              onPress={() => onToggleDate(item.date)}
              accessibilityRole="button"
              accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${formatDisplayDate(item.date)}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                width: '14.2857%',
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.primary : today ? theme.colors.primarySubtle : 'transparent',
                  borderWidth: today && !selected ? 1 : 0,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text
                  token="body"
                  color={selected ? theme.colors.textOnPrimary : theme.colors.textPrimary}
                  style={{ fontWeight: today && !selected ? '700' : undefined }}
                >
                  {manilaParts(item.date).day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
        <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
        <Text token="caption" color={theme.colors.textMuted} style={{ flex: 1 }}>
          Tap dates to add or remove them. You can select multiple dates.
        </Text>
      </View>

      {error ? <Text token="caption" color={theme.colors.danger}>{error}</Text> : null}
    </View>
  );
}
