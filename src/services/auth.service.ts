/**
 * Authentication.
 *
 * Order matters, and it is dictated by the security rules:
 *
 *   register()        creates the Firebase Auth user only.
 *   completeProfile() creates users/{uid} and entitlements/{uid}.
 *
 * The user document is created at role-selection time rather than at signup,
 * because the rules make `role` immutable on update. Writing the document once,
 * with the chosen role, is the only way to keep both the rules and the
 * "choose your role after signing up" flow honest.
 */

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import type { AccountStatus, Entitlement, Role, UserProfile } from '@/types';
import { currentManilaMonthKey } from '@/utils/date';
import { getDb, getFirebaseAuth } from './firebase';

/** Firestore Timestamp | Date | unknown -> Date. */
function toDate(value: unknown, fallback: Date = new Date(0)): Date {
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}

function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const parsed = toDate(value, new Date(Number.NaN));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ---------------------------------------------------------------------------
// Registration and profile creation
// ---------------------------------------------------------------------------

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

/** Creates the Auth user. The Firestore documents come later, at role selection. */
export async function register({ email, password, displayName }: RegisterInput): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  return credential.user.uid;
}

export interface CompleteProfileInput {
  uid: string;
  role: Role;
  displayName: string;
  email: string;
}

/**
 * Creates users/{uid} and the Free entitlement in one logical step.
 * Safe to call twice: an existing document is left untouched.
 */
export async function completeProfile({
  uid,
  role,
  displayName,
  email,
}: CompleteProfileInput): Promise<void> {
  const db = getDb();

  const existing = await getDoc(doc(db, 'users', uid));
  if (existing.exists()) return;

  const now = serverTimestamp();

  // users/{uid} first: the entitlement write evaluates the suspension check,
  // which reads this document.
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: email.trim(),
    displayName: displayName.trim(),
    role,
    accountStatus: 'active' satisfies AccountStatus,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'entitlements', uid), {
    uid,
    plan: 'free',
    proUntil: null,
    trialEndsAt: null,
    usageMonth: currentManilaMonthKey(),
    pdfStatementsThisMonth: 0,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user.uid;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await firebaseSendPasswordReset(getFirebaseAuth(), email.trim());
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role: (data.role ?? 'tutor') as Role,
    accountStatus: (data.accountStatus ?? 'active') as AccountStatus,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function fetchEntitlement(uid: string): Promise<Entitlement | null> {
  const snapshot = await getDoc(doc(getDb(), 'entitlements', uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    uid,
    plan: data.plan === 'pro' ? 'pro' : 'free',
    proUntil: toDateOrNull(data.proUntil),
    trialEndsAt: toDateOrNull(data.trialEndsAt),
    usageMonth: typeof data.usageMonth === 'string' ? data.usageMonth : currentManilaMonthKey(),
    pdfStatementsThisMonth:
      typeof data.pdfStatementsThisMonth === 'number' ? data.pdfStatementsThisMonth : 0,
    updatedAt: toDate(data.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

/** Turns a Firebase error code into something a tutor can act on. */
export function authErrorMessage(error: unknown): string {
  const code =
    error !== null && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/weak-password':
      return 'Passwords need at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Something went wrong. Please try again.';
  }
}
