import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import type { AuthContext, AuthUser } from './auth-strategies/types';
import type { SessionMetadata } from 'src/lib/types/session-metadata';

import { AuthService } from './services/auth.service';
import { CookieService } from './services/cookie.service';
import { CurrentUser, SessionId } from 'src/lib/decorators';

import {
  AccessGuard,
  GoogleLinkGuard,
  GoogleLoginGuard,
  GoogleSignupGuard,
  LocalAuthGuard,
  RefreshGuard,
} from './guards';
import { CurrentAuth } from 'src/lib/decorators/current-auth.decorator';
import { RefreshToken } from 'src/lib/decorators/refresh-token.decorator';
import { ReqMetadata } from 'src/lib/decorators/req-metadata.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  AuthUserResponse,
  SuccessResponse,
  TokenResponse,
} from './dtos/auth-responses.dto';
import {
  CompleteGoogleSignupDto,
  GoogleUserPayload,
  SignUpPayload,
  VerificationCodeRequestPayload,
} from './dtos/auth.dto';

import type { GoogleLinkRequest } from './dtos/auth.dto';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordPayload } from './dtos/change-password-payload.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly configService: ConfigService,
  ) {}

  @Get('/google/signup')
  @UseGuards(GoogleSignupGuard)
  googleSignup() {}

  @Get('google/signup/callback')
  @UseGuards(GoogleSignupGuard)
  async googleSignupCallback(
    @CurrentUser() googleUser: GoogleUserPayload,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const token = await this.authService.createGoogleSignupToken(googleUser);

    return res.redirect(`${frontendUrl}/register/google?token=${token}`);
  }

  @Post('google/signup/complete')
  async completeGoogleSignup(
    @Body() dto: CompleteGoogleSignupDto,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.completeGoogleSignup(
      dto.token,
      dto.companyName,
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

  @Get('/google')
  @UseGuards(GoogleLoginGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleLoginGuard)
  async googleLoginCallback(
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

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return res.redirect(`${frontendUrl}/`);
  }

  @Get('google/link')
  @UseGuards(AccessGuard, GoogleLinkGuard)
  googleLink() {}

  @Get('google/link/callback')
  @UseGuards(AccessGuard, GoogleLinkGuard)
  async googleLinkCallback(@Req() req: GoogleLinkRequest) {
    const authContext = req.authContext;
    const googleUser = req.user;

    await this.authService.completeGoogleLink(authContext.user.id, googleUser);

    return {
      success: true,
      message: 'Google account successfully linked',
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  async signup(
    @Body() payload: SignUpPayload,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const user = await this.authService.signup(payload);

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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin')
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

  @Throttle({ default: { limit: 20, ttl: 60000 } })
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

  @Post('/verification-code')
  async sendVerificationCode(
    @Body() { email }: VerificationCodeRequestPayload,
  ) {
    await this.authService.sendVerificationCode(email);
    return plainToInstance(SuccessResponse, {
      success: true,
    });
  }

  @Patch('password')
  @UseGuards(AccessGuard)
  async changePassword(
    @CurrentUser() authUser: AuthUser,
    @SessionId() sessionId: string,
    @Body() body: ChangePasswordPayload,
  ): Promise<SuccessResponse> {
    await this.authService.changePassword(
      authUser.id,
      authUser.companyId,
      sessionId,
      body,
    );

    return plainToInstance(SuccessResponse, {
      success: true,
    });
  }
}
