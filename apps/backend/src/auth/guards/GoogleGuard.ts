// apps/backend/src/auth/guards/GoogleGuard.ts

import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function createGoogleGuard(strategy: string) {
  class GoogleGuard extends AuthGuard(strategy) {
    handleRequest<TUser = unknown>(
      err: unknown,
      user: unknown,
      info: unknown,
    ): TUser {
      if (err || !user) {
        const infoObj = info as { message?: string } | undefined;

        throw new UnauthorizedException(
          infoObj?.message ?? 'Google authentication failed',
        );
      }

      return user as TUser;
    }
  }

  return GoogleGuard;
}
