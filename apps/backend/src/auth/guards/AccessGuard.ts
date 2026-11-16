import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from 'src/lib/decorators';
import { AuthContext } from '../auth-strategies/types';

/** Registered for the whole app: every route needs a session unless `@Public()`. */
@Injectable()
export class AccessGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic ? true : super.canActivate(context);
  }

  handleRequest<TUser = AuthContext>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<{
      authContext?: TUser;
    }>();

    request.authContext = user;

    return user;
  }
}
