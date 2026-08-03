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

export type ApiMessageError = {
  statusCode: number;
  message?: string | string[];
  error?: string;
};

export function isApiMessageError(error: unknown): error is ApiMessageError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "message" in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "SESSION_EXPIRED") {
      return "Session expired. Please log in again.";
    }
    return error.message;
  }

  if (isApiValidationError(error) && error.errors) {
    const firstField = Object.values(error.errors)[0];
    if (firstField?.[0]) return firstField[0];
  }

  if (isApiMessageError(error)) {
    return Array.isArray(error.message)
      ? error.message[0]
      : (error.message ?? "Something went wrong");
  }

  return "Something went wrong";
}
