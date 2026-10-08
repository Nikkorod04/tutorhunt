/**
 * Stat tile: the money and metric display.
 *
 * `hero` is the single large figure allowed per screen. Values roll up on
 * mount over `deliberate` and jump instantly when they change in place
 * (DESIGN_PLAN sections 4.5 and 6).
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useTheme, type Tone } from '@/theme';
import { useCountUp } from '@/hooks/useCountUp';
import { formatPeso } from '@/utils/currency';
import { Text } from './Text';

export type StatTileVariant = 'default' | 'hero' | 'withDelta';

export interface StatTileProps {
  label: string;
  value: number;
  variant?: StatTileVariant;
  /** Defaults to peso formatting. */
  format?: (value: number) => string;
  /** Required for `withDelta`. */
  deltaLabel?: string;
  deltaTone?: Tone;
  deltaDirection?: 'up' | 'down';
  /** Roll the number up on mount. Off for tiles that update in place. */
  animate?: boolean;
  testID?: string;
}

export function StatTile({
  label,
  value,
  variant = 'default',
  format = formatPeso,
  deltaLabel,
  deltaTone = 'success',
  deltaDirection = 'up',
  animate = false,
  testID,
}: StatTileProps) {
  const theme = useTheme();
  const animated = useCountUp(value, {
    durationMs: theme.motion.duration.deliberate,
    enabled: animate && !theme.reduceMotion,
  });

  const display = animate ? animated : value;
  const toneSet = theme.tones[deltaTone];

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <Text token="micro" color={theme.colors.textSecondary}>
        {label}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space[8] }}>
        <Text
          token={variant === 'hero' ? 'display' : 'h2'}
          tabular
          // Locking the width stops the layout twitching while digits change.
          style={{ minWidth: variant === 'hero' ? 160 : undefined }}
        >
          {format(display)}
        </Text>

        {variant === 'withDelta' && deltaLabel ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: toneSet.subtle,
              borderColor: toneSet.border,
              borderWidth: 0.5,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.space[8],
              paddingVertical: 2,
            }}
          >
            <Ionicons
              name={deltaDirection === 'up' ? 'arrow-up' : 'arrow-down'}
              size={10}
              color={toneSet.text}
            />
            <Text token="caption" color={toneSet.text}>
              {deltaLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
