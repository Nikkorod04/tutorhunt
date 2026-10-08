/**
 * Text field.
 *
 * States: rest, focused, error and disabled. The focus ring is the one place a
 * prominent affordance is allowed, and it is drawn as a tinted wrapper rather
 * than a box-shadow so it behaves identically on Android (DESIGN_PLAN 4.4).
 *
 * The label always sits above the field; a placeholder is never used as a
 * label.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import type { IconName } from './icon';
import { Text } from './Text';

export interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  helper?: string;
  /** Non-null puts the field into the error state and shows the message. */
  error?: string | null;
  disabled?: boolean;
  /** Compact single-line control for dense input groups. */
  compact?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  secureTextEntry?: boolean;
  maxLength?: number;
  /** Shows "12/600" under the field. Requires maxLength. */
  showCounter?: boolean;
  icon?: IconName;
  autoFocus?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  testID?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error = null,
  disabled = false,
  compact = false,
  multiline = false,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  secureTextEntry,
  maxLength,
  showCounter = false,
  icon,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!error || theme.reduceMotion) return;
    shake.value = withSequence(
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [error, shake, theme.reduceMotion]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.borderFocus
      : theme.colors.borderDefault;

  const borderWidth = error || focused ? 2 : 0.5;

  return (
    <View style={{ gap: theme.space[4] }}>
      {label ? <Text token="caption" color={theme.colors.textSecondary}>{label}</Text> : null}

      <Animated.View style={shakeStyle}>
        <View
          style={{
            backgroundColor: focused && !error ? theme.colors.primarySubtle : 'transparent',
            borderRadius: theme.radius.md + 2,
            padding: focused && !error ? 3 : 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: multiline ? 'flex-start' : 'center',
              gap: theme.space[8],
              minHeight: multiline ? 96 : compact ? 34 : 48,
              paddingHorizontal: compact ? theme.space[8] : theme.space[12],
              paddingVertical: multiline ? theme.space[12] : 0,
              backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
              borderColor,
              borderWidth,
              borderRadius: theme.radius.md,
            }}
          >
            {icon ? (
              <Ionicons
                name={icon}
                size={18}
                color={focused ? theme.colors.primary : theme.colors.textHint}
              />
            ) : null}

            <TextInput
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textHint}
              editable={!disabled}
              multiline={multiline}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoComplete={autoComplete}
              textContentType={textContentType}
              secureTextEntry={secureTextEntry}
              maxLength={maxLength}
              autoFocus={autoFocus}
              returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              testID={testID}
              style={[
                compact ? theme.typography.caption : theme.typography.body,
                {
                  flex: 1,
                  color: disabled ? theme.colors.textHint : theme.colors.textPrimary,
                  paddingVertical: multiline ? 0 : compact ? theme.space[4] : theme.space[12],
                  textAlignVertical: multiline ? 'top' : 'center',
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>

      {error ? (
        <Text token="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : helper ? (
        <Text token="caption" color={theme.colors.textMuted}>
          {helper}
        </Text>
      ) : null}

      {showCounter && maxLength ? (
        <Text token="caption" color={theme.colors.textHint} align="right">
          {`${value.length}/${maxLength}`}
        </Text>
      ) : null}
    </View>
  );
}
