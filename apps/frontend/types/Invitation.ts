import { UnusableInvitationCode, UserRole } from "./enums";

export interface CreateInvitationPayload {
  email: string;
  role: UserRole;
  teamId?: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: UserRole;
  team: { id: string; name: string } | null;
  invitedBy: { id: string; firstName: string; lastName: string } | null;
  expiresAt: string;
  /** Still pending after its expiry, so it can be resent. */
  expired: boolean;
  createdAt: string;
}

export interface InvitationValidation {
  email: string;
  role: UserRole;
  companyName: string;
  /** Null when the person who sent it no longer exists. */
  inviterName: string | null;
  teamName: string | null;
  expiresAt: string;
}

/** How the API refuses a link that cannot be used. */
export interface UnusableInvitationError {
  statusCode: number;
  message: string;
  code: UnusableInvitationCode;
  /** Given for an expired or revoked invitation: whom to ask for a new one. */
  companyName?: string;
  inviterName?: string | null;
}

export interface CompleteInvitationPayload {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}
