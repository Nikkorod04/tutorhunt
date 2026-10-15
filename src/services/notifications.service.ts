import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type AppNotification,
  type NotificationPreferences,
  type NotificationType,
} from '@/types';
import { getDb } from './firebase';
import { dataErrorMessage } from '@/utils/error-message';

const NOTIFICATION_PAGE_SIZE = 50;

function notificationsCollection(uid: string) {
  return collection(getDb(), 'notifications', uid, 'items');
}

function preferencesRef(uid: string) {
  return doc(getDb(), 'notificationPreferences', uid);
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function toOptionalDate(value: unknown): Date | null {
  return value === null || value === undefined ? null : toDate(value);
}

function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function notificationType(value: unknown): NotificationType {
  if (value === 'pro_update' || value === 'product_update') return value;
  return 'upcoming_session';
}

function mapNotification(id: string, data: DocumentData): AppNotification {
  return {
    id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    type: notificationType(data.type),
    title: typeof data.title === 'string' ? data.title : 'Tutor Buddy update',
    body: typeof data.body === 'string' ? data.body : '',
    route: typeof data.route === 'string' ? data.route : null,
    data: stringMap(data.data),
    createdAt: toDate(data.createdAt),
    readAt: toOptionalDate(data.readAt),
  };
}

function booleanPreference(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export async function listNotifications(uid: string): Promise<AppNotification[]> {
  const snapshot = await getDocs(query(notificationsCollection(uid), orderBy('createdAt', 'desc'), limit(NOTIFICATION_PAGE_SIZE)));
  return snapshot.docs.map((item) => mapNotification(item.id, item.data()));
}

export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> {
  const snapshot = await getDoc(preferencesRef(uid));
  if (!snapshot.exists()) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  const data = snapshot.data();
  return {
    sessionReminders: booleanPreference(data.sessionReminders, DEFAULT_NOTIFICATION_PREFERENCES.sessionReminders),
    proUpdates: booleanPreference(data.proUpdates, DEFAULT_NOTIFICATION_PREFERENCES.proUpdates),
    productUpdates: booleanPreference(data.productUpdates, DEFAULT_NOTIFICATION_PREFERENCES.productUpdates),
  };
}

export async function updateNotificationPreferences(uid: string, preferences: NotificationPreferences): Promise<void> {
  await setDoc(preferencesRef(uid), {
    uid,
    ...preferences,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(notificationsCollection(uid), notificationId), { readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snapshot = await getDocs(query(notificationsCollection(uid), limit(NOTIFICATION_PAGE_SIZE)));
  const unread = snapshot.docs.filter((item) => item.data().readAt === null || item.data().readAt === undefined);
  if (unread.length === 0) return;

  const batch = writeBatch(getDb());
  unread.forEach((item) => batch.update(item.ref, { readAt: serverTimestamp() }));
  await batch.commit();
}

export function notificationErrorMessage(error: unknown): string {
  return dataErrorMessage(error, 'Could not load your notifications. Please try again.');
}
