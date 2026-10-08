import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

type ToastState = {
  message: string;
  tone: ToastTone;
};

const TOAST_ICONS: Record<
  ToastTone,
  'checkmark-circle' | 'alert-circle' | 'warning' | 'information-circle'
> = {
  success: 'checkmark-circle',
  danger: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((nextMessage: string, tone: ToastTone = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message: nextMessage, tone });
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? <ToastMessage message={toast.message} tone={toast.tone} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}

function ToastMessage({ message, tone }: { message: string; tone: ToastTone }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toneColors = theme.tones[tone];

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + theme.space[12],
        left: theme.space[16],
        right: theme.space[16],
        zIndex: 1000,
        elevation: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space[8],
          paddingHorizontal: theme.space[12],
          paddingVertical: theme.space[12],
          borderRadius: theme.radius.md,
          borderWidth: 0.5,
          borderColor: toneColors.border,
          backgroundColor: toneColors.subtle,
          ...theme.elevation.e2,
        }}
      >
        <Ionicons name={TOAST_ICONS[tone]} size={20} color={toneColors.solid} />
        <Text token="bodyStrong" color={toneColors.text}>{message}</Text>
      </View>
    </View>
  );
}
