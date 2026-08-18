import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtService as NestJwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';
import { JwtAccessPayload, JwtRefreshPayload } from '../auth-strategies/types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(payload: JwtAccessPayload): string {
    return this.jwt.sign(payload, {
      secret: this.configService.getOrThrow<string>('auth.accessToken.secret'),
      expiresIn: this.configService.getOrThrow<StringValue>(
        'auth.accessToken.expiresIn',
      ),
    });
  }

  createRefreshToken(payload: JwtRefreshPayload): string {
    return this.jwt.sign(payload, {
      secret: this.configService.getOrThrow<string>('auth.refreshToken.secret'),
      expiresIn: this.configService.getOrThrow<StringValue>(
        'auth.refreshToken.expiresIn',
      ),
    });
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    return this.jwt.verify<JwtAccessPayload>(token, {
      secret: this.configService.getOrThrow<string>('auth.accessToken.secret'),
    });
  }

  verifyRefreshToken(token: string): JwtRefreshPayload {
    return this.jwt.verify<JwtRefreshPayload>(token, {
      secret: this.configService.getOrThrow<string>('auth.refreshToken.secret'),
    });
  }

  hashRefreshToken(token: string, sessionId: string): string {
    const pepper = this.configService.getOrThrow<string>(
      'auth.refreshToken.hashSecret',
    );

    return createHmac('sha256', `${pepper}:${sessionId}`)
      .update(token)
      .digest('base64url');
  }

  compareRefreshToken(
    token: string,
    storedHash: string,
    sessionId: string,
  ): boolean {
    const computed = this.hashRefreshToken(token, sessionId);

    const a = Buffer.from(computed);
    const b = Buffer.from(storedHash);

    return a.length === b.length && timingSafeEqual(a, b);
  }
}
