//apps/backend/src/auth/decorators/refresh-token.decorator.ts

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const RefreshToken = createParamDecorator(
  (_: never, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.refresh_token as string | undefined;
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    return refreshToken;
  },
);
