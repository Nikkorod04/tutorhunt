type CodedError = {
  code?: unknown;
  message?: unknown;
};

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as CodedError).code;
  return typeof code === 'string' ? code : null;
}

/** Converts common Firebase transport failures into actionable user copy. */
export function dataErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'network-request-failed') {
    return 'No connection right now. Check your internet and try again.';
  }
  if (code === 'permission-denied') {
    return 'You no longer have permission to access this data. Sign in again and try again.';
  }
  if (code === 'resource-exhausted') {
    return 'The service is busy right now. Please wait a moment and try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

