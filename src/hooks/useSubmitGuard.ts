import { useCallback, useRef } from 'react';

/**
 * Prevents a slow save button from starting the same mutation twice before
 * React has rendered its loading state. The ref makes the lock synchronous.
 */
export function useSubmitGuard() {
  const submitting = useRef(false);

  const beginSubmit = useCallback(() => {
    if (submitting.current) return false;
    submitting.current = true;
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submitting.current = false;
  }, []);

  return { beginSubmit, endSubmit };
}
