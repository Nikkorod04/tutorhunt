import { InteractionManager } from 'react-native';

import type { ToastTone } from '@/components/ui';

const NAVIGATION_TOAST_DELAY_MS = 180;

/**
 * Defers updates that affect a screen underneath a native-stack transition.
 * Fabric can otherwise reconcile the underlying list while the transition is
 * still mounting/unmounting the route being left.
 */
export function runAfterNavigation(task: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(task, NAVIGATION_TOAST_DELAY_MS);
  });
}

/**
 * Lets the native stack begin its transition before the persistent root toast
 * mounts. This avoids updating the overlay and navigation tree in the same
 * native frame after a successful mutation.
 */
export function showToastAfterNavigation(
  showToast: (message: string, tone?: ToastTone) => void,
  message: string,
): void {
  runAfterNavigation(() => showToast(message));
}
