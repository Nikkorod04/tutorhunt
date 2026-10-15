import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import type { NotificationPermissionsStatus } from 'expo-notifications';
import { listAllSessions } from './sessions.service';
import { getDb } from './firebase';
import { formatDisplayDateTime } from '@/utils/date';

export const NOTIFICATION_CHANNEL_ID = 'tutor-hunt-updates';
const SESSION_REMINDER_PREFIX = 'tutor-hunt-session-';
const REMINDER_LEAD_TIME_MS = 60 * 60 * 1000;
const SESSION_LOOKAHEAD_MS = 60 * 24 * 60 * 60 * 1000;

let handlerConfigured = false;
type NotificationsModule = typeof import('expo-notifications');
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function hasNotificationApi(notifications: NotificationsModule): boolean {
  return typeof notifications.setNotificationHandler === 'function'
    && typeof notifications.getPermissionsAsync === 'function'
    && typeof notifications.requestPermissionsAsync === 'function'
    && typeof notifications.setNotificationChannelAsync === 'function'
    && typeof notifications.getDevicePushTokenAsync === 'function'
    && typeof notifications.getExpoPushTokenAsync === 'function'
    && typeof notifications.getAllScheduledNotificationsAsync === 'function'
    && typeof notifications.cancelScheduledNotificationAsync === 'function'
    && typeof notifications.scheduleNotificationAsync === 'function'
    && typeof notifications.addNotificationResponseReceivedListener === 'function'
    && typeof notifications.getLastNotificationResponseAsync === 'function'
    && notifications.IosAuthorizationStatus != null
    && notifications.AndroidImportance != null
    && notifications.SchedulableTriggerInputTypes != null;
}

/**
 * Expo Go SDK 53+ throws when expo-notifications is evaluated on Android.
 * Load it only when notification code is actually needed and treat an
 * unavailable native module as an optional capability.
 */
export async function getNotificationModule(): Promise<NotificationsModule | null> {
  // Expo Go's Android client intentionally does not provide remote push
  // notifications. Do not evaluate its partial shim at all.
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((notifications) => hasNotificationApi(notifications) ? notifications : null)
      .catch(() => null);
  }
  return notificationsModulePromise;
}

export interface NotificationRegistrationResult {
  supported: boolean;
  granted: boolean;
  status: string;
  registeredTokens: number;
}

function deviceCollection(uid: string) {
  return collection(getDb(), 'notificationDevices', uid, 'items');
}

function tokenDocumentId(token: string): string {
  // Firestore document IDs cannot contain `/`; a small stable hash also keeps
  // the device token out of the document path while allowing token refreshes
  // to update the same record.
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `device-${(hash >>> 0).toString(16)}`;
}

function projectId(): string | undefined {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

function isGranted(status: NotificationPermissionsStatus, notifications: NotificationsModule): boolean {
  return status.granted || status.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function configureNotificationHandler(): Promise<void> {
  if (handlerConfigured) return;
  const notifications = await getNotificationModule();
  if (!notifications) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const notifications = await getNotificationModule();
  if (!notifications) return;

  await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Tutor Buddy updates',
    importance: notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#4F46E5',
  });
}

export async function requestNotificationPermission(): Promise<NotificationPermissionsStatus | null> {
  const notifications = await getNotificationModule();
  if (!notifications) return null;

  await configureNotificationHandler();
  await configureNotificationChannel();

  const current = await notifications.getPermissionsAsync();
  if (isGranted(current, notifications) || current.status === 'denied') return current;

  return notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}

async function saveDeviceToken(
  uid: string,
  token: string,
  tokenType: 'native' | 'expo',
  permissionStatus: string,
): Promise<void> {
  const ref = doc(deviceCollection(uid), tokenDocumentId(`${tokenType}:${token}`));
  await setDoc(ref, {
    uid,
    token,
    tokenType,
    platform: Platform.OS,
    permissionStatus,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function registerNotificationDevice(uid: string): Promise<NotificationRegistrationResult> {
  if (Platform.OS === 'web') {
    return { supported: false, granted: false, status: 'unsupported', registeredTokens: 0 };
  }

  const notifications = await getNotificationModule();
  if (!notifications) {
    return { supported: false, granted: false, status: 'unavailable', registeredTokens: 0 };
  }

  const permissions = await requestNotificationPermission();
  if (!permissions || !isGranted(permissions, notifications)) {
    return {
      supported: true,
      granted: false,
      status: permissions?.status ?? 'unavailable',
      registeredTokens: 0,
    };
  }

  let registeredTokens = 0;
  try {
    const nativeToken = await notifications.getDevicePushTokenAsync();
    if (typeof nativeToken.data === 'string' && nativeToken.data) {
      await saveDeviceToken(uid, nativeToken.data, 'native', permissions.status);
      registeredTokens += 1;
    }
  } catch {
    // Expo Go and simulators may not expose a native push token. Local
    // notifications still work, so registration should remain best effort.
  }

  const easProjectId = projectId();
  if (easProjectId) {
    try {
      const expoToken = await notifications.getExpoPushTokenAsync({ projectId: easProjectId });
      if (expoToken.data) {
        await saveDeviceToken(uid, expoToken.data, 'expo', permissions.status);
        registeredTokens += 1;
      }
    } catch {
      // An EAS project or native push credentials may not be available yet.
    }
  }

  return {
    supported: true,
    granted: true,
    status: permissions.status,
    registeredTokens,
  };
}

async function cancelSessionReminders(notifications: NotificationsModule): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(SESSION_REMINDER_PREFIX))
      .map((item) => notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function syncUpcomingSessionReminders(uid: string, enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;

  const notifications = await getNotificationModule();
  if (!notifications) return;

  await cancelSessionReminders(notifications);
  if (!enabled) return;

  const permissions = await requestNotificationPermission();
  if (!permissions || !isGranted(permissions, notifications)) return;

  const now = Date.now();
  const latest = now + SESSION_LOOKAHEAD_MS;
  const sessions = await listAllSessions(uid);
  const upcoming = sessions.filter((session) => {
    const startsAt = session.startsAt.getTime();
    return session.status === 'scheduled' && startsAt > now && startsAt <= latest;
  });

  await Promise.all(upcoming.map(async (session) => {
    const reminderAt = session.startsAt.getTime() - REMINDER_LEAD_TIME_MS;
    if (reminderAt <= now) return;

    await notifications.scheduleNotificationAsync({
      identifier: `${SESSION_REMINDER_PREFIX}${session.id}`,
      content: {
        title: 'Upcoming tutoring session',
        body: `${session.subject} starts at ${formatDisplayDateTime(session.startsAt)}.`,
        data: {
          url: `/session-detail?id=${session.id}`,
          type: 'upcoming_session',
          sessionId: session.id,
        },
        sound: 'default',
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminderAt),
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  }));
}

export async function clearLocalSessionReminders(): Promise<void> {
  const notifications = await getNotificationModule();
  if (!notifications) return;
  await cancelSessionReminders(notifications);
}

export function notificationDeliveryErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Notification delivery could not be configured on this device.';
}
