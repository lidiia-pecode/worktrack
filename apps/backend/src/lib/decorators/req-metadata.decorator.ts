import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { SessionMetadata } from '../types/session-metadata';

export const ReqMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionMetadata => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const rawUserAgent = request.headers['user-agent'];
    const userAgent =
      typeof rawUserAgent === 'string' ? rawUserAgent : undefined;

    return {
      ip: request.ip,
      userAgent,
    };
  },
);
