/**
 * Auth and entitlement state.
 *
 * The entitlement is fetched once on sign-in and cached here, so a premium
 * feature check never touches the database (blueprint section 6). It is
 * re-read only after an action that consumes quota.
 */

import { create } from 'zustand';

import { activePlanFor, limitsFor, type PlanLimits } from '@/constants/plans';
import type { Entitlement, UserProfile } from '@/types';

export type AuthStatus =
  /** Restoring the persisted session. */
  | 'loading'
  /** No Firebase config in .env — the app shows a setup screen. */
  | 'unconfigured'
  | 'signedOut'
  /** Signed in but the tutor account document has not been created yet. */
  | 'needsProfile'
  | 'signedIn';

interface AuthState {
  status: AuthStatus;
  firebaseUid: string | null;
  profile: UserProfile | null;
  entitlement: Entitlement | null;
  error: string | null;

  setUnconfigured: () => void;
  setSignedOut: () => void;
  setNeedsProfile: (uid: string) => void;
  setSession: (uid: string, profile: UserProfile, entitlement: Entitlement | null) => void;
  setProfile: (profile: UserProfile) => void;
  setEntitlement: (entitlement: Entitlement | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  firebaseUid: null,
  profile: null,
  entitlement: null,
  error: null,

  setUnconfigured: () => set({ status: 'unconfigured', firebaseUid: null, profile: null }),

  setSignedOut: () =>
    set({ status: 'signedOut', firebaseUid: null, profile: null, entitlement: null }),

  setNeedsProfile: (uid) =>
    set({ status: 'needsProfile', firebaseUid: uid, profile: null, entitlement: null }),

  setSession: (uid, profile, entitlement) =>
    set({ status: 'signedIn', firebaseUid: uid, profile, entitlement, error: null }),

  setProfile: (profile) => set({ profile }),

  setEntitlement: (entitlement) => set({ entitlement }),

  setError: (error) => set({ error }),
}));

// --- selectors -------------------------------------------------------------

/** Plan limits for the signed-in tutor, or Free limits when unknown. */
export function usePlanLimits(): PlanLimits {
  return useAuthStore((state) => limitsFor(activePlanFor(state.entitlement)));
}

export function useRole() {
  return useAuthStore((state) => state.profile?.role ?? null);
}
