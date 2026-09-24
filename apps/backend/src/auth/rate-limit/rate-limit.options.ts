import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request } from 'express';

import { AuthPolicyService } from '../services/auth-policy.service';
import { TokenService } from '../services/token.service';
import {
  ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE,
  ACCOUNT_LIMITED,
  ACCOUNT_THROTTLER,
  RATE_LIMIT_WINDOW_MS,
  REQUESTS_PER_MINUTE,
  trackByClient,
} from './rate-limit.decorators';

const verifyOrNull = <T>(
  token: unknown,
  verify: (token: string) => T,
): T | null => {
  if (typeof token !== 'string') return null;

  try {
    return verify(token);
  } catch {
    return null;
  }
};

// Runs before the route's own sign-in check, so it reads the session from the
// cookies itself. Only a verified token counts; a client-set header proves nothing.
export const createRateLimitOptions = (
  tokenService: TokenService,
  authPolicyService: AuthPolicyService,
  reflector: Reflector,
): ThrottlerModuleOptions => {
  const readAccessToken = (req: Request) =>
    verifyOrNull(req.cookies?.access_token, (token) =>
      tokenService.verifyAccessToken(token),
    );

  const readRefreshToken = (req: Request) =>
    verifyOrNull(req.cookies?.refresh_token, (token) =>
      tokenService.verifyRefreshToken(token),
    );

  const trackBySession = (req: Request): string => {
    const sessionId =
      readAccessToken(req)?.sessionId ?? readRefreshToken(req)?.sessionId;

    return sessionId ? `session:${sessionId}` : trackByClient(req);
  };

  const trackByAccount = (req: Request): string => {
    const { email } = (req.body ?? {}) as { email?: unknown };

    if (typeof email === 'string') {
      return `email:${authPolicyService.normalizeEmail(email)}`;
    }

    const userId = readAccessToken(req)?.id;

    return userId ? `user:${userId}` : trackByClient(req);
  };

  return {
    getTracker: (req) => trackBySession(req as Request),
    throttlers: [
      {
        name: 'default',
        ttl: RATE_LIMIT_WINDOW_MS,
        limit: REQUESTS_PER_MINUTE,
      },
      {
        name: ACCOUNT_THROTTLER,
        ttl: RATE_LIMIT_WINDOW_MS,
        limit: ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE,
        getTracker: (req) => trackByAccount(req as Request),
        skipIf: (context) =>
          !reflector.get<boolean>(ACCOUNT_LIMITED, context.getHandler()),
      },
    ],
  };
};
