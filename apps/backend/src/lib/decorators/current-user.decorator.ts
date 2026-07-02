import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from 'src/auth/auth-strategies/types';
import { User } from 'src/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_: never, context: ExecutionContext): AuthContext['user'] | undefined => {
    const request = context.switchToHttp().getRequest<{
      user?: AuthContext | User;
    }>();

    const payload = request.user;

    if (!payload) return undefined;

    if ('user' in payload) {
      return payload.user;
    }

    return payload;
  },
);
