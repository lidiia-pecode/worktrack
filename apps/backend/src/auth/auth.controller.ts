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
import { CompleteGoogleLinkDto } from './dtos/complete-google-link.dto';
import { SessionService } from './services';
import { GoogleAuthService } from './services/google-auth.service';
import { Serialize } from 'src/lib/interceptors';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly cookieService: CookieService,
    private readonly configService: ConfigService,
  ) {}

  private async handleGoogleCallback(
    googleUser: GoogleUserPayload,
    metadata: SessionMetadata,
    res: Response,
  ) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const result = await this.googleAuthService.validateGoogleLogin(googleUser);

    if (result.type === 'login') {
      const tokens = await this.sessionService.createSession(
        result.user,
        metadata,
      );

      this.cookieService.setAuthCookies(
        res,
        tokens.access_token,
        tokens.refresh_token,
      );

      return res.redirect(`${frontendUrl}/`);
    }

    if (result.type === 'link') {
      const linkToken = await this.googleAuthService.createGoogleLinkToken(
        result.userId,
        result.googleId,
      );

      return res.redirect(`${frontendUrl}/google/link?token=${linkToken}`);
    }

    const signupToken = await this.googleAuthService.createGoogleSignupToken(
      result.googleUser,
    );

    return res.redirect(`${frontendUrl}/google/signup?token=${signupToken}`);
  }

  @Get('/google/signup')
  @UseGuards(GoogleSignupGuard)
  googleSignup() {}

  @Get('google/signup/callback')
  @UseGuards(GoogleSignupGuard)
  async googleSignupCallback(
    @CurrentUser() googleUser: GoogleUserPayload,
    @ReqMetadata() metadata: SessionMetadata,
    @Res() res: Response,
  ) {
    return this.handleGoogleCallback(googleUser, metadata, res);
  }

  @Post('google/signup/complete')
  @Serialize(TokenResponse)
  async completeGoogleSignup(
    @Body() dto: CompleteGoogleSignupDto,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.googleAuthService.completeGoogleSignup(
      dto.token,
      dto.companyName,
      metadata,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return {
      access_token: tokens.access_token,
    };
  }

  @Get('/google')
  @UseGuards(GoogleLoginGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleLoginGuard)
  async googleLoginCallback(
    @CurrentUser() googleUser: GoogleUserPayload,
    @ReqMetadata() metadata: SessionMetadata,
    @Res() res: Response,
  ) {
    return this.handleGoogleCallback(googleUser, metadata, res);
  }

  @Get('google/link')
  @UseGuards(AccessGuard, GoogleLinkGuard)
  googleLink() {}

  @Get('google/link/callback')
  @UseGuards(AccessGuard, GoogleLinkGuard)
  async googleLinkCallback(@Req() req: GoogleLinkRequest) {
    const authContext = req.authContext;
    const googleUser = req.user;

    await this.googleAuthService.completeGoogleLink(
      authContext.user.id,
      googleUser,
    );

    return {
      success: true,
      message: 'Google account successfully linked',
    };
  }

  @Post('google/link/complete')
  @Serialize(TokenResponse)
  async completeGoogleLinkWithPassword(
    @Body() dto: CompleteGoogleLinkDto,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.googleAuthService.completeGoogleLinkWithPassword(
      dto.token,
      dto.password,
      metadata,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return {
      access_token: tokens.access_token,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  @Serialize(TokenResponse)
  async signup(
    @Body() payload: SignUpPayload,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const user = await this.authService.signup(payload);

    const tokens = await this.sessionService.createSession(user, metadata);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return {
      access_token: tokens.access_token,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signin')
  @Serialize(TokenResponse)
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: AuthUser,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.sessionService.createSession(user, metadata);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return {
      access_token: tokens.access_token,
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  @Serialize(TokenResponse)
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

    return {
      access_token: tokens.access_token,
    };
  }

  @Post('logout')
  @Serialize(SuccessResponse)
  @UseGuards(AccessGuard)
  async logout(
    @SessionId() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponse> {
    await this.authService.logout(sessionId);
    this.cookieService.clearAuthCookies(res);

    return {
      success: true,
    };
  }

  @Post('logout-all')
  @Serialize(SuccessResponse)
  @UseGuards(AccessGuard)
  async logoutAll(
    @CurrentUser() authUser: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponse> {
    await this.authService.logoutAll(authUser.id);
    this.cookieService.clearAuthCookies(res);

    return {
      success: true,
    };
  }

  @Get('me')
  @Serialize(AuthUserResponse)
  @UseGuards(AccessGuard)
  me(@CurrentUser() user: AuthUser): AuthUserResponse {
    return user;
  }

  @Post('/verification-code')
  @Serialize(SuccessResponse)
  async sendVerificationCode(
    @Body() { email }: VerificationCodeRequestPayload,
  ) {
    await this.authService.sendVerificationCode(email);
    return {
      success: true,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('password')
  @Serialize(SuccessResponse)
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

    return {
      success: true,
    };
  }
}
