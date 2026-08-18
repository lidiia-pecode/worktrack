import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('auth.cookie.secure'),
      sameSite: this.configService.getOrThrow<CookieOptions['sameSite']>(
        'auth.cookie.sameSite',
      ),
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
      maxAge: this.configService.getOrThrow<number>(
        'auth.accessToken.cookieMaxAgeMs',
      ),
    });

    res.cookie('refresh_token', refreshToken, {
      ...options,
      maxAge: this.configService.getOrThrow<number>(
        'auth.refreshToken.cookieMaxAgeMs',
      ),
    });
  }

  clearAuthCookies(res: Response): void {
    const options = this.getCookieOptions();

    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', options);
  }
}
