import { HttpException, HttpStatus } from '@nestjs/common';

/** Sent as `code`, so the invitation page can say what happened to the link. */
export enum UnusableInvitationCode {
  NOT_FOUND = 'INVITATION_NOT_FOUND',
  EXPIRED = 'INVITATION_EXPIRED',
  REVOKED = 'INVITATION_REVOKED',
  ACCEPTED = 'INVITATION_ACCEPTED',
  ACCOUNT_EXISTS = 'INVITATION_ACCOUNT_EXISTS',
}

const RESPONSES: Record<
  UnusableInvitationCode,
  { status: HttpStatus; message: string }
> = {
  [UnusableInvitationCode.NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Invitation not found',
  },
  [UnusableInvitationCode.EXPIRED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invitation has expired',
  },
  [UnusableInvitationCode.REVOKED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invitation has been revoked',
  },
  [UnusableInvitationCode.ACCEPTED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invitation has already been accepted',
  },
  [UnusableInvitationCode.ACCOUNT_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'An account with this email already exists',
  },
};

/**
 * Who to ask for a new link. Given only for an expired or revoked invitation,
 * to someone who holds its link.
 */
type InviterContext = { companyName: string; inviterName: string | null };

export const unusableInvitation = (
  code: UnusableInvitationCode,
  context?: InviterContext,
): HttpException => {
  const { status, message } = RESPONSES[code];

  return new HttpException(
    { statusCode: status, message, code, ...context },
    status,
  );
};
