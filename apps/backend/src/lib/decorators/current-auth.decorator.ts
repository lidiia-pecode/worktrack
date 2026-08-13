// src/lib/decorators/current-auth.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthContext } from 'src/auth/auth-strategies/types';

export const CurrentAuth = createParamDecorator(
  (_: never, context: ExecutionContext): AuthContext => {
    const request = context
      .switchToHttp()
      .getRequest<{ authContext?: AuthContext }>();

    if (!request.authContext) {
      throw new UnauthorizedException();
    }
    return request.authContext;
  },
);
