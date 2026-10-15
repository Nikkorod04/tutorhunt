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
  Pressable,
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
  /** Hide the inline message when a composite field renders one below its controls. */
  showErrorMessage?: boolean;
  disabled?: boolean;
  /** Compact single-line control for dense input groups. */
  compact?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: TextInputProps['autoCorrect'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  secureTextEntry?: boolean;
  maxLength?: number;
  /** Shows "12/600" under the field. Requires maxLength. */
  showCounter?: boolean;
  icon?: IconName;
  rightAction?: {
    icon: IconName;
    onPress: () => void;
    accessibilityLabel: string;
  };
  autoFocus?: boolean;
  /** Ref exposed to forms that need to focus the next field from the keyboard. */
  inputRef?: React.RefObject<TextInput | null>;
  /** Makes the field display-only while still allowing a custom press action. */
  readOnly?: boolean;
  onPress?: () => void;
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
  showErrorMessage = true,
  disabled = false,
  compact = false,
  multiline = false,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  secureTextEntry,
  maxLength,
  showCounter = false,
  icon,
  rightAction,
  autoFocus,
  inputRef,
  readOnly = false,
  onPress,
  returnKeyType,
  onSubmitEditing,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const localInputRef = React.useRef<TextInput>(null);
  const fieldRef = inputRef ?? localInputRef;
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
        <Pressable
          onPress={disabled ? undefined : onPress ?? (readOnly ? undefined : () => fieldRef.current?.focus())}
          disabled={disabled}
          accessible={false}
          hitSlop={compact ? 6 : undefined}
        >
        <View
          style={{
            backgroundColor: 'transparent',
            borderRadius: theme.radius.md + 2,
            padding: 0,
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
                ref={fieldRef}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textHint}
              editable={!disabled && !readOnly}
              multiline={multiline}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              autoComplete={autoComplete}
              textContentType={textContentType}
              secureTextEntry={secureTextEntry}
              maxLength={maxLength}
              autoFocus={autoFocus}
              underlineColorAndroid="transparent"
              selectionColor={theme.colors.primary}
              cursorColor={theme.colors.primary}
              returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              testID={testID}
              style={[
                compact ? theme.typography.caption : theme.typography.body,
                {
                  flex: 1,
                  minHeight: multiline ? 72 : undefined,
                  alignSelf: multiline ? 'stretch' : undefined,
                  backgroundColor: 'transparent',
                  color: disabled ? theme.colors.textHint : theme.colors.textPrimary,
                  paddingVertical: multiline ? 0 : compact ? theme.space[4] : theme.space[12],
                  textAlignVertical: multiline ? 'top' : 'center',
                },
              ]}
            />
            {rightAction ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  rightAction.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={rightAction.accessibilityLabel}
                hitSlop={8}
                style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={rightAction.icon} size={20} color={focused ? theme.colors.primary : theme.colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>
        </Pressable>
      </Animated.View>

      {error && showErrorMessage ? (
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
