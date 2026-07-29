export type ApiValidationError = {
  statusCode: number;
  errors?: Record<string, string[]>;
  message?: string;
};

export function isApiValidationError(
  error: unknown,
): error is ApiValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "errors" in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "SESSION_EXPIRED") {
      return "Session expired. Please log in again.";
    }
    return error.message;
  }

  return "Something went wrong";
}
