/**
 * Authentication.
 *
 * Order matters, and it is dictated by the security rules:
 *
 *   register()        creates the Firebase Auth user only.
 *   completeProfile() creates users/{uid} and entitlements/{uid}.
 *
 * The user document is created during tutor onboarding rather than at sign-in,
 * because the rules make `role` immutable on update. New accounts always write
 * the tutor role once; legacy parent accounts are rejected during migration.
 */

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Platform } from 'react-native';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type { AccountStatus, Entitlement, TutorAvatarId, UserProfile } from '@/types';
import { currentManilaMonthKey } from '@/utils/date';
import { getDb, getFileStorage, getFirebaseAuth } from './firebase';

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

/** Creates the Auth user. The Firestore documents come later, at tutor onboarding. */
export async function register({ email, password, displayName }: RegisterInput): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  return credential.user.uid;
}

export interface CompleteProfileInput {
  uid: string;
  displayName: string;
  email: string;
  photoUrl?: string | null;
}

/**
 * Creates users/{uid} and the Free entitlement in one logical step.
 * Safe to call twice: an existing document is left untouched.
 */
export async function completeProfile({
  uid,
  displayName,
  email,
  photoUrl = null,
}: CompleteProfileInput): Promise<void> {
  const db = getDb();

  const userRef = doc(db, 'users', uid);
  const entitlementRef = doc(db, 'entitlements', uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    await ensureAccountEntitlement(uid, entitlementRef);
    return;
  }

  const now = serverTimestamp();

  // Commit both onboarding documents together. If the app is closed while
  // onboarding is being saved, the account cannot be left half-created.
  const batch = writeBatch(db);
  batch.set(userRef, {
    uid,
    email: email.trim(),
    displayName: displayName.trim(),
    photoUrl,
    avatarId: 'default' satisfies TutorAvatarId,
    customAvatarUrl: null,
    role: 'tutor',
    accountStatus: 'active' satisfies AccountStatus,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(entitlementRef, {
    uid,
    plan: 'free',
    proUntil: null,
    trialEndsAt: null,
    usageMonth: currentManilaMonthKey(),
    pdfStatementsThisMonth: 0,
    updatedAt: now,
  });

  await batch.commit();
}

/** Creates the initial Free entitlement when an older account is missing it. */
export async function ensureAccountEntitlement(
  uid: string,
  entitlementRef = doc(getDb(), 'entitlements', uid),
): Promise<void> {
  const existing = await getDoc(entitlementRef);
  if (existing.exists()) return;

  await setDoc(entitlementRef, {
    uid,
    plan: 'free',
    proUntil: null,
    trialEndsAt: null,
    usageMonth: currentManilaMonthKey(),
    pdfStatementsThisMonth: 0,
    updatedAt: serverTimestamp(),
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

type NativeGoogleSignIn = typeof import('react-native-nitro-google-signin');

declare const require: (moduleId: string) => unknown;

let nativeGoogleSignInConfigured = false;

function getNativeGoogleSignIn(): NativeGoogleSignIn {
  // This package contains native code and must not be loaded by the web bundle.
  try {
    const nativeModule = require('react-native-nitro-google-signin') as Partial<NativeGoogleSignIn> | null;
    if (!nativeModule?.GoogleOneTapSignIn) {
      throw new Error('The native Google Sign-In module is unavailable in this app build.');
    }
    return nativeModule as NativeGoogleSignIn;
  } catch {
    const error = new Error(
      'Google Sign-In is unavailable in Expo Go. Install the Tutor Buddy EAS development build and try again.',
    ) as Error & { code: string };
    error.code = 'auth/native-google-signin-unavailable';
    throw error;
  }
}

function cancelledGoogleSignInError(): Error & { code: string } {
  const error = new Error('Google sign-in was cancelled.') as Error & { code: string };
  error.code = 'auth/cancelled-popup-request';
  return error;
}

/** Signs in with Google, then exchanges the Google ID token for a Firebase session. */
export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();

  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user.uid;
  }

  const google = getNativeGoogleSignIn();
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  if (!webClientId) {
    throw new Error(
      'Google sign-in is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app.',
    );
  }

  if (!nativeGoogleSignInConfigured) {
    google.GoogleOneTapSignIn.configure({
      webClientId,
    });
    nativeGoogleSignInConfigured = true;
  }

  await google.GoogleOneTapSignIn.checkPlayServices();

  // Use the explicit account picker for the main sign-in action. The regular
  // `signIn()` flow filters to accounts that have already authorized this app,
  // so it can silently stop at the first registered account and hide a second
  // Google account. The explicit flow lists all accounts on the device and
  // allows the user to add another account.
  let response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
  if (google.isNoSavedCredentialFoundResponse(response)) {
    response = await google.GoogleOneTapSignIn.createAccount();
  }

  if (google.isCancelledResponse(response)) {
    throw cancelledGoogleSignInError();
  }

  if (!google.isSuccessResponse(response)) {
    throw new Error('Google sign-in did not return an account. Please try again.');
  }

  const firebaseCredential = GoogleAuthProvider.credential(response.data.idToken);
  const credential = await signInWithCredential(auth, firebaseCredential);
  return credential.user.uid;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());

  // Clear the native Google session too so the next sign-in can choose another
  // Google account instead of silently restoring the previous one.
  if (Platform.OS !== 'web') {
    try {
      await getNativeGoogleSignIn().GoogleOneTapSignIn.signOut();
    } catch {
      // Firebase is already signed out; a stale native Google session is not
      // allowed to prevent the user from leaving the app.
    }
  }
}

/** Updates the account photo saved from the user's Google account. */
export async function updateUserPhoto(uid: string, photoUrl: string | null): Promise<void> {
  await updateDoc(doc(getDb(), 'users', uid), {
    photoUrl,
    updatedAt: serverTimestamp(),
  });
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function uploadTutorAvatar(uid: string, uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected photo.');
  const blob = await response.blob();
  if (blob.size > MAX_AVATAR_BYTES) throw new Error('Choose a photo smaller than 5 MB.');

  const avatarRef = ref(getFileStorage(), `users/${uid}/profile/avatar`);
  await uploadBytes(avatarRef, blob, { contentType: mimeType });
  return getDownloadURL(avatarRef);
}

async function removeTutorAvatar(url: string | null): Promise<void> {
  if (!url) return;
  try {
    await deleteObject(ref(getFileStorage(), url));
  } catch {
    // A missing/stale object must not prevent changing the avatar.
  }
}

export interface TutorAvatarInput {
  avatarId: TutorAvatarId;
  customAvatarUrl?: string | null;
  customAvatarLocalUri?: string | null;
  customAvatarMimeType?: string | null;
}

export async function updateTutorAvatar(uid: string, input: TutorAvatarInput): Promise<string | null> {
  const profileRef = doc(getDb(), 'users', uid);
  const current = await getDoc(profileRef);
  const previousUrl = current.exists() && typeof current.data().customAvatarUrl === 'string'
    ? current.data().customAvatarUrl as string
    : null;

  let nextUrl = input.avatarId === 'custom' ? input.customAvatarUrl ?? null : null;
  if (input.avatarId === 'custom' && input.customAvatarLocalUri) {
    nextUrl = await uploadTutorAvatar(uid, input.customAvatarLocalUri, input.customAvatarMimeType ?? 'image/jpeg');
  }

  await updateDoc(profileRef, {
    avatarId: input.avatarId,
    customAvatarUrl: nextUrl,
    updatedAt: serverTimestamp(),
  });

  if (previousUrl && previousUrl !== nextUrl) await removeTutorAvatar(previousUrl);
  return nextUrl;
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
  if (data.role === 'parent') {
    const error = new Error('Parent accounts are no longer supported. Please sign in with a tutor account.') as Error & { code: string };
    error.code = 'auth/legacy-parent-account';
    throw error;
  }

  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    avatarId: data.avatarId === 'custom' || (typeof data.avatarId === 'string' && /^animal-0[1-5]$/.test(data.avatarId))
      ? data.avatarId
      : 'default',
    customAvatarUrl: typeof data.customAvatarUrl === 'string' ? data.customAvatarUrl : null,
    role: data.role === 'admin' ? 'admin' : 'tutor',
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
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'SIGN_IN_CANCELLED':
      return 'Google sign-in was cancelled.';
    case 'DEVELOPER_ERROR':
      return 'Google sign-in is not configured for this app build. Rebuild the development app and try again.';
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return 'Google Play Services is unavailable or needs an update on this device.';
    case 'ONE_TAP_START_FAILED':
      return 'Google sign-in could not start. Check your connection and try again.';
    case 'auth/native-google-signin-unavailable':
      return 'Google Sign-In needs the Tutor Buddy development build. Expo Go cannot provide this native module.';
    case 'auth/legacy-parent-account':
      return 'This app is now for tutor accounts. Please sign in with a tutor account.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Something went wrong. Please try again.';
  }
}
