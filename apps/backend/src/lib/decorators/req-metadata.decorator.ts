import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { SessionMetadata } from '../types/session-metadata';

export const ReqMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionMetadata => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // 1. IP
    const forwardedFor = request.headers['x-forwarded-for'];
    let ip: string | undefined;

    if (typeof forwardedFor === 'string') {
      ip = forwardedFor.split(',')[0].trim();
    } else {
      const rawIp = request.ip || request.socket?.remoteAddress;
      if (typeof rawIp === 'string') {
        ip = rawIp;
      }
    }

    // 2. User-Agent
    const rawUserAgent = request.headers['user-agent'];
    const userAgent =
      typeof rawUserAgent === 'string' ? rawUserAgent : undefined;

    return {
      ip,
      userAgent,
    };
  },
);
