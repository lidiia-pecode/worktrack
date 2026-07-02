export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'SESSION_EXPIRED') {
      return 'Session expired. Please log in again.';
    }
    return error.message;
  }

  return 'Something went wrong';
}
