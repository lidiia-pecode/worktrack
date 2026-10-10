import { UnusableInvitationCode } from "@/types/enums";
import type { UnusableInvitationError } from "@/types/Invitation";

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

/** Whether the API refused the request itself, which asking again won't change. */
export function isClientError(error: unknown): boolean {
  return (
    isApiMessageError(error) &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

/** The API refused it as taken, such as a name already in use. */
export function isConflictError(error: unknown): boolean {
  return isApiMessageError(error) && error.statusCode === 409;
}

/** For a read by id: the entity doesn't exist, or the id isn't one (400). */
export function isMissingEntityError(error: unknown): boolean {
  return (
    isApiMessageError(error) &&
    (error.statusCode === 404 || error.statusCode === 400)
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "SESSION_EXPIRED") {
      return "Session expired. Please log in again.";
    }
    return error.message;
  }

  if (isApiMessageError(error) && error.statusCode === 429) {
    return "Too many attempts. Please wait a minute and try again.";
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

const UNUSABLE_INVITATION_CODES: string[] = Object.values(
  UnusableInvitationCode,
);

export function isUnusableInvitationError(
  error: unknown,
): error is UnusableInvitationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    UNUSABLE_INVITATION_CODES.includes(error.code)
  );
}
