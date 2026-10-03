import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Sent as `code` beside the message. A Google sign-in fails on a redirect, so
 * the page it returns to only gets the code and chooses the words itself.
 */
export enum AuthErrorCode {
  GOOGLE_FAILED = 'GOOGLE_FAILED',
  GOOGLE_CANCELLED = 'GOOGLE_CANCELLED',
  GOOGLE_NO_ACCOUNT = 'GOOGLE_NO_ACCOUNT',
  GOOGLE_EMAIL_MISMATCH = 'GOOGLE_EMAIL_MISMATCH',
  GOOGLE_ACCOUNT_IN_USE = 'GOOGLE_ACCOUNT_IN_USE',
  GOOGLE_NAME_MISSING = 'GOOGLE_NAME_MISSING',
  GOOGLE_EMAIL_UNVERIFIED = 'GOOGLE_EMAIL_UNVERIFIED',
  ACCOUNT_USES_OTHER_GOOGLE = 'ACCOUNT_USES_OTHER_GOOGLE',
  ACCOUNT_EXISTS = 'ACCOUNT_EXISTS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  COMPANY_SUSPENDED = 'COMPANY_SUSPENDED',
}

const RESPONSES: Record<
  Exclude<
    AuthErrorCode,
    AuthErrorCode.GOOGLE_FAILED | AuthErrorCode.GOOGLE_CANCELLED
  >,
  { status: HttpStatus; message: string }
> = {
  [AuthErrorCode.GOOGLE_NO_ACCOUNT]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'No account uses this Google address',
  },
  [AuthErrorCode.GOOGLE_EMAIL_MISMATCH]: {
    status: HttpStatus.CONFLICT,
    message: "The Google account's email address does not match",
  },
  [AuthErrorCode.GOOGLE_ACCOUNT_IN_USE]: {
    status: HttpStatus.CONFLICT,
    message: 'This Google account is already linked to another user',
  },
  [AuthErrorCode.GOOGLE_NAME_MISSING]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'First name and last name are required',
  },
  [AuthErrorCode.GOOGLE_EMAIL_UNVERIFIED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: "Google hasn't verified this account's email address",
  },
  [AuthErrorCode.ACCOUNT_USES_OTHER_GOOGLE]: {
    status: HttpStatus.CONFLICT,
    message: 'The account for this email is linked to another Google account',
  },
  [AuthErrorCode.ACCOUNT_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'A user with this email already exists',
  },
  [AuthErrorCode.ACCOUNT_INACTIVE]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      "This account has been deactivated. Ask your company's owner if you need access again.",
  },
  [AuthErrorCode.COMPANY_SUSPENDED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Company account is suspended. Please contact billing.',
  },
};

export const authError = (code: keyof typeof RESPONSES): HttpException => {
  const { status, message } = RESPONSES[code];

  return new HttpException({ statusCode: status, message, code }, status);
};
