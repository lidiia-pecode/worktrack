import { UserRole } from "./enums";

export interface AuthUserResponse {
  id: string;
  email: string;
  companyId: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  password: string;
}
