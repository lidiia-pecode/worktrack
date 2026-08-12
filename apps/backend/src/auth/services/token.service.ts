import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { JwtAccessPayload, JwtRefreshPayload } from '../auth-strategies/types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(payload: JwtAccessPayload): string {
    return this.jwt.sign(payload, {
      secret: this.configService.getOrThrow('ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.get<JwtSignOptions['expiresIn']>(
        'ACCESS_TOKEN_EXPIRES_IN',
        // '15m',
        '1m',
      ),
    });
  }

  createRefreshToken(payload: JwtRefreshPayload): string {
    return this.jwt.sign(payload, {
      secret: this.configService.getOrThrow('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<JwtSignOptions['expiresIn']>(
        'REFRESH_TOKEN_EXPIRES_IN',
        '30d',
      ),
    });
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    return this.jwt.verify(token, {
      secret: this.configService.getOrThrow('ACCESS_TOKEN_SECRET'),
    });
  }

  verifyRefreshToken(token: string): JwtRefreshPayload {
    return this.jwt.verify(token, {
      secret: this.configService.getOrThrow('REFRESH_TOKEN_SECRET'),
    });
  }
  hashRefreshToken(token: string, sessionId: string): string {
    const pepper = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HASH_SECRET',
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
