// apps/backend/src/auth/services/cookie.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  private getCookieOptions(): CookieOptions {
    const sameSite = this.configService.get<CookieOptions['sameSite']>(
      'AUTH_COOKIE_SAMESITE',
      'lax',
    );
    const secure = this.configService.get<boolean>('AUTH_COOKIE_SECURE', false);

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const options = this.getCookieOptions();

    res.cookie('access_token', accessToken, {
      ...options,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...options,
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    const options = this.getCookieOptions();

    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', {
      ...options,
      path: '/auth/refresh',
    });
  }
}
