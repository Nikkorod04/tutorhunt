/**
 * Restores the session on launch and hydrates the auth store.
 *
 * onAuthStateChanged fires once on mount with the persisted user, so this is
 * also the cold-start path. The profile and entitlement are fetched together
 * here, which is the single read the blueprint's section 6 asks for.
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { fetchEntitlement, fetchUserProfile } from '@/services/auth.service';
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';

export function useAuthBootstrap(): void {
  useEffect(() => {
    const {
      setUnconfigured,
      setSignedOut,
      setNeedsRole,
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
            // Signed in, but role selection has not happened yet.
            setNeedsRole(user.uid);
            return;
          }

          const entitlement = await fetchEntitlement(user.uid);
          setSession(user.uid, profile, entitlement);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : 'Could not load your account. Check your connection.',
          );
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
