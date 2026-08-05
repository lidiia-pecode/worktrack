import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import type { AuthContext, AuthUser } from './auth-strategies/types';
import type { SessionMetadata } from 'src/lib/types/session-metadata';

import { AuthService } from './services/auth.service';
import { CookieService } from './services/cookie.service';
import { CurrentUser, SessionId } from 'src/lib/decorators';

import {
  AccessGuard,
  GoogleGuard,
  LocalAuthGuard,
  RefreshGuard,
} from './guards';
import { CurrentAuth } from 'src/lib/decorators/current-auth.decorator';
import { RefreshToken } from 'src/lib/decorators/refresh-token.decorator';
import { LinkGoogleDto } from './dtos/link-google.dto';
import { ReqMetadata } from 'src/lib/decorators/req-metadata.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  AuthUserResponse,
  LinkGoogleResponse,
  SuccessResponse,
  TokenResponse,
} from './dtos/auth-responses.dto';
import { VerificationCodeRequestPayload } from './dtos/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Get('/google')
  @UseGuards(GoogleGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleAuthRedirect(
    @CurrentUser() user: AuthUser,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.createSession(user, metadata);
    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return res.redirect(`${process.env.FRONTEND_URL}/`);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: AuthUser,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.createSession(user, metadata);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return plainToInstance(TokenResponse, {
      access_token: tokens.access_token,
    });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @UseGuards(RefreshGuard)
  async refresh(
    @CurrentAuth() auth: AuthContext,
    @RefreshToken() refreshToken: string,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.refreshAccessToken(
      refreshToken,
      auth,
      metadata,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return plainToInstance(TokenResponse, {
      access_token: tokens.access_token,
    });
  }

  @Post('logout')
  @UseGuards(AccessGuard)
  async logout(
    @SessionId() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponse> {
    await this.authService.logout(sessionId);
    this.cookieService.clearAuthCookies(res);

    return plainToInstance(SuccessResponse, {
      success: true,
    });
  }

  @Post('logout-all')
  @UseGuards(AccessGuard)
  async logoutAll(
    @CurrentUser() authUser: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponse> {
    await this.authService.logoutAll(authUser.id);
    this.cookieService.clearAuthCookies(res);

    return plainToInstance(SuccessResponse, {
      success: true,
    });
  }

  @Get('me')
  @UseGuards(AccessGuard)
  me(@CurrentUser() authUser: AuthUser): AuthUserResponse {
    return plainToInstance(AuthUserResponse, authUser);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('google/link')
  @UseGuards(AccessGuard)
  async linkGoogle(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: LinkGoogleDto,
  ): Promise<LinkGoogleResponse> {
    await this.authService.linkGoogleAccount(authUser.id, dto.googleId);

    return plainToInstance(LinkGoogleResponse, {
      success: true,
      message: 'Google account successfully linked',
    });
  }

  @Post('/verification-code')
  async sendVerificationCode(
    @Body() { email }: VerificationCodeRequestPayload,
  ) {
    await this.authService.sendVerificationCode(email);
    return plainToInstance(SuccessResponse, {
      success: true,
    });
  }
}
