import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function createGoogleGuard(strategy: string) {
  class GoogleGuard extends AuthGuard(strategy) {
    readonly logger = new Logger(`GoogleGuard:${strategy}`);

    handleRequest<TUser = unknown>(
      err: unknown,
      user: unknown,
      info: unknown,
    ): TUser {
      if (err || !user) {
        const infoObj = info as { message?: string } | undefined;

        this.logger.warn(
          `Google authentication failed: ${
            err instanceof Error ? err.message : (infoObj?.message ?? 'no user')
          }`,
        );

        if (err instanceof HttpException) throw err;

        throw new UnauthorizedException(
          infoObj?.message ?? 'Google authentication failed',
        );
      }

      return user as TUser;
    }
  }

  return GoogleGuard;
}
