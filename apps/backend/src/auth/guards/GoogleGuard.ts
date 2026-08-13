import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleLoginGuard extends AuthGuard('google-login') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const infoObj = info as { message?: string } | undefined;

      throw new UnauthorizedException(
        infoObj?.message || 'Google authentication failed',
      );
    }

    return user as TUser;
  }
}

@Injectable()
export class GoogleSignupGuard extends AuthGuard('google-signup') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const infoObj = info as { message?: string } | undefined;

      throw new UnauthorizedException(
        infoObj?.message || 'Google authentication failed',
      );
    }

    return user as TUser;
  }
}

@Injectable()
export class GoogleLinkGuard extends AuthGuard('google-link') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const infoObj = info as { message?: string } | undefined;

      throw new UnauthorizedException(
        infoObj?.message || 'Google authentication failed',
      );
    }

    return user as TUser;
  }
}
