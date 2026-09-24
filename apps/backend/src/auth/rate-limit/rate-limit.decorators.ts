import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

export const RATE_LIMIT_WINDOW_MS = 60_000;

export const REQUESTS_PER_MINUTE = 100;
export const REFRESHES_PER_MINUTE = 20;
// Kept above the per-account limit: people in one office share an address.
export const CLIENT_AUTH_ATTEMPTS_PER_MINUTE = 20;
export const ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE = 5;

export const ACCOUNT_THROTTLER = 'account';
export const ACCOUNT_LIMITED = 'rate-limit:account-limited';

export const trackByClient = (req: Request): string => `client:${req.ip}`;

export const LimitPerSession = (limit: number) =>
  Throttle({ default: { limit, ttl: RATE_LIMIT_WINDOW_MS } });

// For routes used before signing in, where there is no session to count.
export const LimitPerClient = (limit: number) =>
  Throttle({
    default: {
      limit,
      ttl: RATE_LIMIT_WINDOW_MS,
      getTracker: (req) => trackByClient(req as Request),
    },
  });

export const LimitPerAccount = (limit: number) =>
  applyDecorators(
    SetMetadata(ACCOUNT_LIMITED, true),
    Throttle({ [ACCOUNT_THROTTLER]: { limit, ttl: RATE_LIMIT_WINDOW_MS } }),
  );
