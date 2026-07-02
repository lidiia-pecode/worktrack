import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';

import { AuthService } from './services/auth.service';
import {
  SignInPayload,
  SignUpPayload,
  VerificationCodeRequestPayload,
} from './auth.dto';

import type { Response } from 'express';
import { RefreshToken } from './decorators';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { SessionId } from 'src/lib/decorators/session-id.decorator';
import { GoogleGuard, LocalAuthGuard, RefreshGuard } from './guards';
import type { UUID } from 'crypto';
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from 'src/lib/consts';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  private setCookies(
    res: Response,
    {
      access_token,
      refresh_token,
    }: {
      access_token: string;
      refresh_token: string;
    },
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  private clearCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('access_token', cookieOptions);
  }

  @Get('/google')
  @UseGuards(GoogleGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleAuthRedirect(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.initializeUserSession(user);
    this.setCookies(res, tokens);

    return res.redirect(`${process.env.FRONTEND_URL}/projects`);
  }

  @Post('/signup')
  async signup(
    @Body() payload: SignUpPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.signup(payload);
    this.setCookies(res, tokens);

    return { success: true };
  }

  @UseGuards(LocalAuthGuard)
  @Post('/signin')
  async signin(
    @Body() payload: SignInPayload,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.initializeUserSession(user);
    this.setCookies(res, tokens);

    return { success: true };
  }

  @Post('/verification-code')
  async sendVerificationCode(
    @Body() { email }: VerificationCodeRequestPayload,
  ) {
    await this.service.sendVerificationCode(email);
    return { success: true };
  }

  @UseGuards(RefreshGuard)
  @Post('/refresh')
  async refresh(
    @CurrentUser() user: User,
    @SessionId() sessionId: UUID,
    @RefreshToken() refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.refreshAccessToken(refreshToken, {
      user,
      sessionId,
    });

    this.setCookies(res, tokens);

    return { success: true };
  }

  @UseGuards(RefreshGuard)
  @Post('/logout')
  async logout(
    @SessionId() sessionId: UUID,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearCookies(res);
    return this.service.logout(sessionId);
  }

  @UseGuards(RefreshGuard)
  @Post('/logout-all')
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearCookies(res);
    return await this.service.logoutAll(user);
  }
}
