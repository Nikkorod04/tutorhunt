/**
 * Restores the session on launch and hydrates the auth store.
 *
 * onAuthStateChanged fires once on mount with the persisted user, so this is
 * also the cold-start path. The profile and entitlement are fetched together
 * here, which is the single read the blueprint's section 6 asks for.
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { ensureAccountEntitlement, fetchEntitlement, fetchUserProfile, signOut } from '@/services/auth.service';
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';

export function useAuthBootstrap(): void {
  useEffect(() => {
    const {
      setUnconfigured,
      setSignedOut,
      setNeedsProfile,
      setSession,
      setError,
    } = useAuthStore.getState();

    if (!isFirebaseConfigured) {
      setUnconfigured();
      return;
    }

    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setSignedOut();
          return;
        }

        try {
          const profile = await fetchUserProfile(user.uid);

          if (!profile) {
            // Signed in, but the tutor account has not been created yet.
            setNeedsProfile(user.uid);
            return;
          }

          let entitlement = await fetchEntitlement(user.uid);
          if (!entitlement) {
            // Recover accounts created before onboarding writes were made
            // atomic, or accounts interrupted between profile and entitlement
            // creation. Firestore rules only allow the initial Free record.
            await ensureAccountEntitlement(user.uid);
            entitlement = await fetchEntitlement(user.uid);
          }
          setSession(user.uid, profile, entitlement);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : 'Could not load your account. Check your connection.',
          );
          if (error instanceof Error && 'code' in error && error.code === 'auth/legacy-parent-account') {
            await signOut();
          }
          setSignedOut();
        }
      },
      (error) => {
        setError(error.message);
        setSignedOut();
      },
    );

    return unsubscribe;
  }, []);
}
