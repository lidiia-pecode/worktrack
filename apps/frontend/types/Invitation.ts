import { UserRole } from "./enums";

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
  createdAt: string;
}

export interface InvitationValidation {
  email: string;
  role: UserRole;
  expiresAt: string;
}

export interface CompleteInvitationPayload {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}
