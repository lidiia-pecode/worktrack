// apps/backend/src/auth/auth-strategies/types.ts

import { UserRole } from 'src/users/enums/UserRole.enum';

export interface JwtAccessPayload {
  id: string;
  email: string;
  companyId: string;
  role: string;
  sessionId: string;
}

export interface JwtRefreshPayload {
  id: string;
  companyId: string;
  sessionId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  companyId: string;
  role: UserRole;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}
