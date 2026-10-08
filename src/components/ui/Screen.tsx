/**
 * Screen shell: canvas background, safe-area insets and the standard gutter.
 *
 * Every screen renders through this so padding is never re-invented and the
 * canvas is never pure white (DESIGN_PLAN section 10, rule 1).
 */

import React, { type ReactNode, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap the content in a ScrollView. */
  scroll?: boolean;
  /** Apply the horizontal screen gutter. Off for edge-to-edge lists. */
  padded?: boolean;
  /** Rendered above the content and outside the scroll area. */
  header?: ReactNode;
  /** Pinned above the safe area, outside the scroll area. */
  footer?: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  header,
  footer,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const padding = padded ? { paddingHorizontal: theme.layout.screenPadding } : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.canvas }, style]}>
      <View style={{ paddingTop: insets.top }}>{header}</View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              padding,
              {
                paddingTop: header ? 0 : insets.top,
                paddingBottom: theme.space[32] + insets.bottom + keyboardHeight,
              },
              contentStyle,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.flex,
              padding,
              { paddingTop: header ? 0 : insets.top },
              contentStyle,
            ]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>

      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
