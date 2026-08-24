import { UserRole } from "./enums";

export interface CreateInvitationPayload {
  email: string;
  role: UserRole;
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
