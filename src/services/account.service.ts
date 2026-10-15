import { getFunctions, httpsCallable } from 'firebase/functions';

import { signOut } from './auth.service';
import { getFirebaseApp } from './firebase';

/** Permanently deletes the signed-in tutor through the trusted backend. */
export async function deleteMyAccount(): Promise<void> {
  const deleteAccount = httpsCallable<undefined, { deleted: boolean }>(
    getFunctions(getFirebaseApp()),
    'deleteMyAccount',
  );
  const result = await deleteAccount(undefined);
  if (result.data.deleted !== true) throw new Error('The account deletion was not confirmed.');
  await signOut();
}

export function accountErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not delete the account. Please try again.';
}
