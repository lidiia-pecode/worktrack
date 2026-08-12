import { Injectable, UnauthorizedException } from '@nestjs/common';

import { User } from 'src/users/entities/user.entity';

import { GoogleUserPayload, SignInPayload } from '../dtos/auth.dto';

import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { UsersService } from 'src/users/users.service';
import { AuthContext, AuthUser } from '../auth-strategies/types';
import { ConfigService } from '@nestjs/config';
import { SessionMetadata } from 'src/lib/types/session-metadata';
import { UserStatus } from 'src/users/enums/UserRole.enum';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  private getSessionExpirationDate(): Date {
    const days = this.configService.getOrThrow<number>(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  async validateLocalUser(payload: SignInPayload): Promise<User> {
    const user = await this.usersService.findByEmailWithCompany(
      payload.email.toLowerCase().trim(),
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Company account is suspended. Please contact billing.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.passwordService.verify(
      payload.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateGoogleUser(payload: GoogleUserPayload): Promise<User> {
    const { googleId } = payload;

    const user = await this.usersService.findByGoogleIdWithCompany(googleId);

    if (!user) {
      throw new UnauthorizedException(
        'Google account is not linked to any user.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Company account is suspended. Please contact billing.',
      );
    }

    return user;
  }

  async createSession(user: AuthUser, metadata?: SessionMetadata) {
    const expiresAt = this.getSessionExpirationDate();
    const sessionId = crypto.randomUUID();

    const accessToken = this.tokenService.createAccessToken({
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      sessionId,
    });

    const refreshToken = this.tokenService.createRefreshToken({
      id: user.id,
      companyId: user.companyId,
      sessionId,
    });

    const refreshHash = this.tokenService.hashRefreshToken(
      refreshToken,
      sessionId,
    );

    await this.sessionService.create({
      id: sessionId,
      userId: user.id,
      companyId: user.companyId,
      refreshHash,
      expiresAt,
      ip: metadata?.ip ?? '0.0.0.0',
      userAgent: metadata?.userAgent ?? 'unknown',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshAccessToken(
    refreshToken: string,
    auth: AuthContext,
    metadata?: SessionMetadata,
  ) {
    const session = await this.sessionService.findById(auth.sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (new Date() > session.expiresAt) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException('Session has expired');
    }

    if (session.userId !== auth.user.id) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException('Session does not belong to the user');
    }

    if (session.companyId !== auth.user.companyId) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException('Session company mismatch');
    }

    const user = await this.usersService.findUserByIdWithCompany(auth.user.id);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException('Company account is suspended.');
    }

    if (user.companyId !== session.companyId) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException('User company has changed');
    }

    // 1. hash the token that came from the client
    const incomingRefreshHash = this.tokenService.hashRefreshToken(
      refreshToken,
      session.id,
    );

    // 2. new refresh token and its hash
    const newRefreshToken = this.tokenService.createRefreshToken({
      id: user.id,
      companyId: user.companyId,
      sessionId: session.id,
    });

    const newRefreshHash = this.tokenService.hashRefreshToken(
      newRefreshToken,
      session.id,
    );

    const newExpiresAt = this.getSessionExpirationDate();

    // 3. ATOMIC UPDATE:
    const isUpdated = await this.sessionService.rotateRefreshHash(
      session.id,
      incomingRefreshHash,
      newRefreshHash,
      newExpiresAt,
      metadata,
    );

    // 4. If 0 records were updated — this token HAS ALREADY BEEN used
    if (!isUpdated) {
      await this.sessionService.delete(session.id);
      throw new UnauthorizedException(
        'Invalid or previously used refresh token',
      );
    }

    // 5. return new Access Token
    const accessToken = this.tokenService.createAccessToken({
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      sessionId: session.id,
    });

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.deleteAllForUser(userId);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    const user = await this.usersService.findUserByIdWithCompany(userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    await this.usersService.linkGoogleAccount(userId, googleId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createVerificationCode(email: string) {
    return new Promise<number>((resolve) => {
      resolve(123456);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async verifyCode(email: string, code: number) {
    return await Promise.resolve(true);
  }

  public async sendVerificationCode(email: string) {
    const code = await this.createVerificationCode(email);

    return code;
  }
}
