import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  private static readonly ACCESS_TOKEN_COOKIE = 'access_token';
  private static readonly REFRESH_TOKEN_COOKIE = 'refresh_token';
  private static readonly INVITATION_FLOW_COOKIE = 'invitation_flow_token';

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

    res.cookie(CookieService.ACCESS_TOKEN_COOKIE, accessToken, {
      ...options,
      maxAge: this.configService.getOrThrow<number>(
        'auth.accessToken.maxAgeMs',
      ),
    });

    res.cookie(CookieService.REFRESH_TOKEN_COOKIE, refreshToken, {
      ...options,
      maxAge: this.configService.getOrThrow<number>(
        'auth.refreshToken.maxAgeMs',
      ),
    });
  }

  clearAuthCookies(res: Response): void {
    const options = this.getCookieOptions();

    res.clearCookie(CookieService.ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(CookieService.REFRESH_TOKEN_COOKIE, options);
  }

  setInvitationFlowCookie(res: Response, token: string): void {
    res.cookie(CookieService.INVITATION_FLOW_COOKIE, token, {
      ...this.getCookieOptions(),
      maxAge: this.configService.getOrThrow<number>(
        'auth.invitation.expiresInMs',
      ),
    });
  }

  clearInvitationFlowCookie(res: Response): void {
    res.clearCookie(CookieService.INVITATION_FLOW_COOKIE, {
      ...this.getCookieOptions(),
    });
  }

  getFrontendUrl(): string {
    return this.configService.getOrThrow<string>('FRONTEND_URL');
  }
}
