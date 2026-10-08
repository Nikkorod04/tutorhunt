/**
 * List row.
 *
 * Every row has a leading visual and a trailing affordance; a bare text row is
 * one of the things that makes an app look generic (DESIGN_PLAN rule 3).
 *
 * Rows tint on press rather than scaling: shrinking a full-width row reads as
 * a glitch, not as feedback.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Avatar, icon chip or coloured initial. */
  leading?: ReactNode;
  /** Chips, amounts, badges. */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  /** Draws a hairline divider below the row. */
  divider?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showChevron = false,
  accessibilityLabel,
  divider = false,
}: ListRowProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[12],
        paddingVertical: theme.space[12],
        paddingHorizontal: theme.layout.cardPadding,
        backgroundColor: pressed ? theme.colors.surfaceSunken : 'transparent',
      }}
    >
      {leading}

      <View style={{ flex: 1, gap: 2 }}>
        <Text token="h3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text token="caption" color={theme.colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing}

      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textHint} />
      ) : null}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {divider ? (
        <View
          style={{ height: 0.5, backgroundColor: theme.colors.borderSubtle, marginLeft: theme.layout.cardPadding }}
        />
      ) : null}
    </View>
  );
}
