import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthContext } from '../auth-strategies/types';

@Injectable()
export class AccessGuard extends AuthGuard('jwt-access') {
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
