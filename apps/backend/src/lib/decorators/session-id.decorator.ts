import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthContext } from 'src/auth/auth-strategies/types';

export const SessionId = createParamDecorator(
  (
    _: never,
    context: ExecutionContext,
  ): AuthContext['sessionId'] | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    const sessionId = request.user?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedException('Session ID is missing');
    }

    return sessionId;
  },
);
