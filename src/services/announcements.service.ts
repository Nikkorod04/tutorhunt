import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

import type { Announcement, UserAnnouncement } from '@/types';
import { getDb } from './firebase';
import { dataErrorMessage } from '@/utils/error-message';

const ANNOUNCEMENT_PAGE_SIZE = 50;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4000;

function announcementsCollection() {
  return collection(getDb(), 'announcements');
}

function readsCollection(uid: string) {
  return collection(getDb(), 'announcementReads', uid, 'items');
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function mapAnnouncement(id: string, data: DocumentData): Announcement {
  const createdAt = toDate(data.createdAt);
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Tutor Buddy announcement',
    message: typeof data.message === 'string' ? data.message : '',
    createdAt,
    updatedAt: toDate(data.updatedAt, createdAt),
    createdByUid: typeof data.createdByUid === 'string' ? data.createdByUid : '',
  };
}

function validateText(title: string, message: string): { title: string; message: string } {
  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  if (!cleanTitle) throw new Error('Enter an announcement title.');
  if (!cleanMessage) throw new Error('Enter an announcement message.');
  if (cleanTitle.length > MAX_TITLE_LENGTH) throw new Error(`The title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  if (cleanMessage.length > MAX_MESSAGE_LENGTH) throw new Error(`The announcement must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
  return { title: cleanTitle, message: cleanMessage };
}

export async function listAdminAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(query(announcementsCollection(), orderBy('createdAt', 'desc'), limit(ANNOUNCEMENT_PAGE_SIZE)));
  return snapshot.docs.map((item) => mapAnnouncement(item.id, item.data()));
}

export async function createAnnouncement(uid: string, title: string, message: string): Promise<void> {
  const clean = validateText(title, message);
  const announcementRef = doc(announcementsCollection());
  await setDoc(announcementRef, {
    title: clean.title,
    message: clean.message,
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  if (!announcementId) throw new Error('Choose an announcement to delete.');
  await deleteDoc(doc(getDb(), 'announcements', announcementId));
}

export async function listAnnouncements(uid: string): Promise<UserAnnouncement[]> {
  const [announcementSnapshot, readSnapshot] = await Promise.all([
    getDocs(query(announcementsCollection(), orderBy('createdAt', 'desc'), limit(ANNOUNCEMENT_PAGE_SIZE))),
    getDocs(query(readsCollection(uid), limit(ANNOUNCEMENT_PAGE_SIZE))),
  ]);
  const readAtById = new Map(
    readSnapshot.docs.map((item) => [item.id, item.data().readAt ? toDate(item.data().readAt) : null]),
  );
  return announcementSnapshot.docs.map((item) => ({
    ...mapAnnouncement(item.id, item.data()),
    readAt: readAtById.get(item.id) ?? null,
  }));
}

export async function getAnnouncement(uid: string, announcementId: string): Promise<UserAnnouncement | null> {
  const [announcementSnapshot, readSnapshot] = await Promise.all([
    getDoc(doc(getDb(), 'announcements', announcementId)),
    getDoc(doc(readsCollection(uid), announcementId)),
  ]);
  if (!announcementSnapshot.exists()) return null;

  return {
    ...mapAnnouncement(announcementSnapshot.id, announcementSnapshot.data()),
    readAt: readSnapshot.exists() && readSnapshot.data().readAt
      ? toDate(readSnapshot.data().readAt)
      : null,
  };
}

export async function markAnnouncementRead(uid: string, announcementId: string): Promise<void> {
  await setDoc(doc(readsCollection(uid), announcementId), {
    uid,
    announcementId,
    readAt: serverTimestamp(),
  }, { merge: true });
}

export async function markAllAnnouncementsRead(uid: string): Promise<void> {
  const announcements = await getDocs(query(announcementsCollection(), limit(ANNOUNCEMENT_PAGE_SIZE)));
  if (announcements.empty) return;
  const batch = writeBatch(getDb());
  announcements.docs.forEach((item) => {
    batch.set(doc(readsCollection(uid), item.id), {
      uid,
      announcementId: item.id,
      readAt: serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
}

export function announcementErrorMessage(error: unknown): string {
  return dataErrorMessage(error, 'Could not load announcements. Please try again.');
}
