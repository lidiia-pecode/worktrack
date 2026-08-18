// apps/backend/src/auth/auth-strategies/types.ts

import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { GoogleUserPayload } from '../dtos/auth.dto';

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

export type GoogleLoginResult =
  | {
      type: 'login';
      user: User;
    }
  | {
      type: 'link';
      userId: string;
      googleId: string;
    }
  | {
      type: 'signup';
      googleUser: GoogleUserPayload;
    };
