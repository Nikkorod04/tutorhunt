import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { ParentPost, ParentPostBudgetType, ParentPostInterest, ParentPostInterestStatus, ParentPostStatus, ParentPostTutoringMode } from '@/types';
import { getDb } from './firebase';

export const PARENT_POST_PAGE_SIZE = 15;

export interface ParentPostInput {
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  city: string;
  area: string;
  scheduleText: string;
  tutoringMode: ParentPostTutoringMode;
  budgetType: ParentPostBudgetType;
  minBudget: number | null;
  maxBudget: number | null;
  contactVisible: boolean;
}

function postsCol() { return collection(getDb(), 'parentPosts'); }

function interestsCol(postId: string) {
  return collection(getDb(), 'parentPosts', postId, 'interests');
}

function toDate(value: unknown, fallback = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  return fallback;
}

function toOptionalDate(value: unknown): Date | null {
  return value === null || value === undefined ? null : toDate(value);
}

function mapPost(id: string, data: DocumentData): ParentPost {
  return {
    id,
    parentUid: typeof data.parentUid === 'string' ? data.parentUid : '',
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    subject: typeof data.subject === 'string' ? data.subject : '',
    gradeLevel: typeof data.gradeLevel === 'string' ? data.gradeLevel : '',
    city: typeof data.city === 'string' ? data.city : '',
    area: typeof data.area === 'string' ? data.area : '',
    scheduleText: typeof data.scheduleText === 'string' ? data.scheduleText : '',
    tutoringMode: (data.tutoringMode ?? 'either') as ParentPostTutoringMode,
    budgetType: (data.budgetType ?? 'negotiable') as ParentPostBudgetType,
    minBudget: typeof data.minBudget === 'number' ? data.minBudget : null,
    maxBudget: typeof data.maxBudget === 'number' ? data.maxBudget : null,
    contactVisible: data.contactVisible === true,
    status: (data.status ?? 'open') as ParentPostStatus,
    createdAt: toDate(data.createdAt),
    editedAt: toOptionalDate(data.editedAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapInterest(postId: string, id: string, data: DocumentData): ParentPostInterest {
  return {
    id,
    postId,
    tutorUid: typeof data.tutorUid === 'string' ? data.tutorUid : id,
    parentUid: typeof data.parentUid === 'string' ? data.parentUid : '',
    message: typeof data.message === 'string' ? data.message : '',
    status: (data.status === 'withdrawn' ? 'withdrawn' : 'active') as ParentPostInterestStatus,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export interface ParentPostPage {
  items: ParentPost[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listParentPosts(options: { parentUid?: string; city?: string; status?: ParentPostStatus; cursor?: QueryDocumentSnapshot<DocumentData> | null } = {}): Promise<ParentPostPage> {
  const constraints: QueryConstraint[] = [];
  if (options.parentUid) constraints.push(where('parentUid', '==', options.parentUid));
  if (options.status) constraints.push(where('status', '==', options.status));
  if (options.city) constraints.push(where('city', '==', options.city));
  constraints.push(orderBy('createdAt', 'desc'));
  if (options.cursor) constraints.push(startAfter(options.cursor));
  const snapshot = await getDocs(query(postsCol(), ...constraints, fsLimit(PARENT_POST_PAGE_SIZE + 1)));
  const hasMore = snapshot.docs.length > PARENT_POST_PAGE_SIZE;
  const pageDocs = hasMore ? snapshot.docs.slice(0, PARENT_POST_PAGE_SIZE) : snapshot.docs;
  return { items: pageDocs.map((item) => mapPost(item.id, item.data())), cursor: pageDocs.at(-1) ?? null, hasMore };
}

export async function getParentPost(id: string): Promise<ParentPost | null> {
  const snapshot = await getDoc(doc(postsCol(), id));
  return snapshot.exists() ? mapPost(snapshot.id, snapshot.data()) : null;
}

export async function createParentPost(parentUid: string, input: ParentPostInput): Promise<string> {
  const ref = doc(postsCol());
  await setDoc(ref, { id: ref.id, parentUid, ...input, status: 'open', createdAt: serverTimestamp(), editedAt: null, updatedAt: serverTimestamp() });
  return ref.id;
}

async function ownedPost(parentUid: string, postId: string) {
  const ref = doc(postsCol(), postId);
  const current = await getDoc(ref);
  if (!current.exists() || current.data().parentUid !== parentUid) throw new Error('You can only manage your own request.');
  return ref;
}

export async function updateParentPost(parentUid: string, postId: string, input: ParentPostInput): Promise<void> {
  await updateDoc(await ownedPost(parentUid, postId), { ...input, editedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function closeParentPost(parentUid: string, postId: string): Promise<void> {
  await updateDoc(await ownedPost(parentUid, postId), { status: 'closed', updatedAt: serverTimestamp() });
}

export async function deleteParentPost(parentUid: string, postId: string): Promise<void> {
  await deleteDoc(await ownedPost(parentUid, postId));
}

export async function getParentPostInterest(postId: string, tutorUid: string): Promise<ParentPostInterest | null> {
  const snapshot = await getDoc(doc(interestsCol(postId), tutorUid));
  return snapshot.exists() ? mapInterest(postId, snapshot.id, snapshot.data()) : null;
}

export async function listParentPostInterests(postId: string): Promise<ParentPostInterest[]> {
  const snapshot = await getDocs(query(interestsCol(postId), orderBy('createdAt', 'desc'), fsLimit(50)));
  return snapshot.docs
    .map((item) => mapInterest(postId, item.id, item.data()))
    .filter((item) => item.status === 'active');
}

export async function createParentPostInterest(post: Pick<ParentPost, 'id' | 'parentUid' | 'status'>, tutorUid: string, message: string): Promise<ParentPostInterest> {
  if (post.status !== 'open') throw new Error('This tutoring request is no longer open.');
  const ref = doc(interestsCol(post.id), tutorUid);
  const current = await getDoc(ref);
  const createdAt = current.exists() ? current.data().createdAt : serverTimestamp();
  await setDoc(ref, {
    tutorUid,
    parentUid: post.parentUid,
    message: message.trim(),
    status: 'active',
    createdAt,
    updatedAt: serverTimestamp(),
  });
  const saved = await getDoc(ref);
  if (!saved.exists()) throw new Error('Your interest could not be saved.');
  return mapInterest(post.id, saved.id, saved.data());
}

export async function withdrawParentPostInterest(postId: string, tutorUid: string): Promise<void> {
  await updateDoc(doc(interestsCol(postId), tutorUid), { status: 'withdrawn', updatedAt: serverTimestamp() });
}

export function parentPostErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Could not update the tutoring request. Please try again.';
}
