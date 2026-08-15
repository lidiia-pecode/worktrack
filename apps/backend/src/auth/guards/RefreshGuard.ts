import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthContext } from '../auth-strategies/types';

@Injectable()
export class RefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = AuthContext>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { authContext?: TUser }>();

    request.authContext = user;

    return user;
  }
}
