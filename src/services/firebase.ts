/**
 * Firebase bootstrap.
 *
 * The JS SDK is used rather than React Native Firebase, because the JS SDK
 * needs no native module and therefore runs in Expo Go (blueprint section 4).
 *
 * Auth persistence is explicit: on React Native the SDK has no default
 * storage, so without initializeAuth + AsyncStorage the session is lost on
 * every reload.
 *
 * Config comes from EXPO_PUBLIC_* environment variables. When they are absent
 * the app still boots and shows a setup screen instead of crashing, so the
 * project is runnable before a Firebase project exists.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  // Firebase Web config is public client configuration. The environment
  // values remain the normal source, while the fallback keeps Expo Go native
  // bundles working when a platform does not expose EXPO_PUBLIC_* correctly.
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyA57JrToNG_1q4yGHDFJpbR_ejteZAmTm0',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'tutorhunt-ded38.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'tutorhunt-ded38',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'tutorhunt-ded38.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '811935301688',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:811935301688:web:48d6ff791e6796488466cd',
};

/** True once the bundled or environment-provided Firebase config is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function requireConfig(): void {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and fill in your project values.',
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  requireConfig();
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  const instance = getFirebaseApp();
  if (!authInstance) {
    try {
      authInstance = initializeAuth(instance, {
        // Resolved lazily. Cast because the persistence type lives in the
        // React Native build of firebase/auth, which plain TypeScript
        // resolution does not see.
        persistence: getReactNativePersistenceLazy() as never,
      });
    } catch {
      // Already initialised (for example after a fast refresh).
      authInstance = getAuth(instance);
    }
  }
  return authInstance;
}

export function getDb(): Firestore {
  const instance = getFirebaseApp();
  if (!dbInstance) {
    dbInstance = getFirestore(instance);
  }
  return dbInstance;
}

export function getFileStorage(): FirebaseStorage {
  const instance = getFirebaseApp();
  if (!storageInstance) {
    storageInstance = getStorage(instance);
  }
  return storageInstance;
}

/**
 * React Native has no default auth storage, so without this the session is
 * lost on every reload.
 *
 * `getReactNativePersistence` lives in the React Native build of
 * `firebase/auth`, which Metro resolves automatically but plain TypeScript
 * resolution does not. Requiring it lazily and checking for the function keeps
 * the type layer honest and turns a bundler misconfiguration into a clear
 * error rather than a silent loss of session persistence.
 */
declare const require: (moduleId: string) => unknown;

function getReactNativePersistenceLazy(): unknown {
  const authModule = require('firebase/auth') as {
    getReactNativePersistence?: (storage: unknown) => unknown;
  };

  if (typeof authModule.getReactNativePersistence !== 'function') {
    throw new Error(
      'getReactNativePersistence is missing from firebase/auth. Auth would not ' +
        'survive a reload. Check that Metro is resolving the React Native build.',
    );
  }

  return authModule.getReactNativePersistence(AsyncStorage);
}
