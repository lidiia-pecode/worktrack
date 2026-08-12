// src/lib/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext, AuthUser } from 'src/auth/auth-strategies/types';

type RequestUser = AuthContext | AuthUser | undefined;
const isAuthContext = (u: RequestUser): u is AuthContext => !!u && 'user' in u;

export const CurrentUser = createParamDecorator(
  (_: never, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const raw = request.user;
    return isAuthContext(raw) ? raw.user : raw;
  },
);
