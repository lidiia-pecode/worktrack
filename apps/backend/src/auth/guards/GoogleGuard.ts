import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const infoObj = info as { message?: string } | undefined;
      const errorMessage = infoObj?.message || 'Google authentication failed';

      if (err instanceof Error) {
        throw err;
      }

      throw new UnauthorizedException(errorMessage);
    }

    return user as TUser;
  }
}
