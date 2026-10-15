import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import type { IconName } from './icon';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: IconName;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Consistent, touch-friendly confirmation dialog for destructive actions. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon = 'alert-circle-outline',
  destructive = true,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const accent = destructive ? theme.colors.danger : theme.colors.primary;
  const accentSubtle = destructive ? theme.colors.dangerSubtle : theme.colors.primarySubtle;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceOverlay, justifyContent: 'center', padding: theme.space[20] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close confirmation dialog"
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />

        <Card variant="raised" style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <View style={{ gap: theme.space[16] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
              <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: accentSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={21} color={accent} />
              </View>
              <View style={{ flex: 1, gap: theme.space[4] }}>
                <Text token="h2">{title}</Text>
                <Text token="body" color={theme.colors.textSecondary}>{message}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.space[8] }}>
              <View style={{ flex: 1 }}>
                <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={confirmLabel} variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} loading={busy} fullWidth />
              </View>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
