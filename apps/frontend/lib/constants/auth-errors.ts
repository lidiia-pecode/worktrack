// Mirrors the backend's AuthErrorCode. A failed Google sign-in returns to the
// page it started from with only the code, so the words live here.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  GOOGLE_CANCELLED: "Google was cancelled before it finished.",
  GOOGLE_NO_ACCOUNT:
    "No WorkTrack account uses this Google address. If you were invited, open the link in your invitation email. To start a new company, sign up instead.",
  GOOGLE_EMAIL_MISMATCH:
    "That Google account uses a different email address. Choose the Google account with the right address.",
  GOOGLE_ACCOUNT_IN_USE:
    "This Google account is already linked to another WorkTrack account.",
  GOOGLE_NAME_MISSING:
    "Your Google profile has no first or last name. Create your account with a password instead.",
  GOOGLE_EMAIL_UNVERIFIED:
    "Google hasn't verified the email address of this account. Verify it with Google, or use a password instead.",
  ACCOUNT_USES_OTHER_GOOGLE:
    "The WorkTrack account for this address signs in with a different Google account. Use that one.",
  ACCOUNT_EXISTS:
    "An account with this email address already exists. Sign in instead.",
  ACCOUNT_INACTIVE:
    "This account has been deactivated. Ask your company's owner if you need access again.",
  COMPANY_SUSPENDED: "This company's WorkTrack account is suspended.",
};

const GOOGLE_FAILED_MESSAGE = "Something went wrong with Google. Try again.";

/** The message for a Google sign-in that returned with `?error=`, if any. */
export const googleErrorMessage = (
  code: string | null | undefined,
): string | null =>
  code ? (GOOGLE_ERROR_MESSAGES[code] ?? GOOGLE_FAILED_MESSAGE) : null;
