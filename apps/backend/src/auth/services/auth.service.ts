import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

import { User } from 'src/users/entities/user.entity';
import { Company } from 'src/companies/entities/company.entity';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';

import { ChangePasswordPayload } from '../dtos/change-password-payload.dto';
import { SignInPayload, SignUpPayload } from '../dtos/auth.dto';
import { AuthContext } from '../auth-strategies/types';
import { SessionMetadata } from 'src/lib/types/session-metadata';

import { CompaniesService } from 'src/companies/companies.service';
import { AuthPolicyService } from './auth-policy.service';
import { UsersService } from 'src/users/users.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly passwordResetService: PasswordResetService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly authPolicyService: AuthPolicyService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // used in local strategy
  async validateLocalUser(payload: SignInPayload): Promise<User> {
    const normalizedEmail = this.authPolicyService.normalizeEmail(
      payload.email,
    );

    const user =
      await this.usersService.findByEmailWithCompany(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.authPolicyService.validateUserAccess(user);

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

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.authPolicyService.validateUserAccess(user);

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

    const newExpiresAt = this.sessionService.getSessionExpirationDate();

    // 3. ATOMIC UPDATE:
    const isUpdated = await this.sessionService.rotateRefreshHash(
      session.id,
      incomingRefreshHash,
      newRefreshHash,
      newExpiresAt,
      metadata,
    );

    // 4. Handle failed update (Token Reuse or concurrent retry)
    if (!isUpdated) {
      const currentSession = await this.sessionService.findById(session.id);

      if (!currentSession) {
        throw new UnauthorizedException('Session has been terminated');
      }

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

  async signup(payload: SignUpPayload): Promise<User> {
    const email = this.authPolicyService.normalizeEmail(payload.email);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const companyRepository = manager.getRepository(Company);

        const company = await this.companiesService.create(
          payload.companyName,
          companyRepository,
        );

        const passwordHash = await this.passwordService.hash(payload.password);

        const user = userRepository.create({
          companyId: company.id,
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email,
          passwordHash,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
        });

        return await userRepository.save(user);
      });
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.deleteAllForUser(userId);
  }

  async changePassword(
    userId: string,
    companyId: string,
    sessionId: string,
    payload: ChangePasswordPayload,
  ): Promise<void> {
    const user = await this.usersService.getUserById(userId, companyId);

    if (user.passwordHash) {
      if (!payload.currentPassword) {
        throw new BadRequestException('Current password is required');
      }

      const isCurrentPasswordValid = await this.passwordService.verify(
        payload.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      const isSamePassword = await this.passwordService.verify(
        payload.newPassword,
        user.passwordHash,
      );

      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from the current password',
        );
      }
    }

    const passwordHash = await this.passwordService.hash(payload.newPassword);

    await this.dataSource.transaction(async (manager) => {
      await this.usersService.updatePassword(
        user.id,
        user.companyId,
        passwordHash,
        manager,
      );

      await this.sessionService.deleteAllForUserExcept(
        user.id,
        sessionId,
        manager,
      );
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = this.authPolicyService.normalizeEmail(email);

    await this.passwordResetService.requestPasswordReset(normalizedEmail);
  }

  async resetPassword(
    token: string,
    newPassword: string,
    metadata: SessionMetadata,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const resetToken = await this.passwordResetService.consumeToken(
        token,
        manager,
      );

      const user = await this.usersService.findUserByIdWithCompany(
        resetToken.userId,
        manager,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      if (user.passwordHash) {
        const isSamePassword = await this.passwordService.verify(
          newPassword,
          user.passwordHash,
        );

        if (isSamePassword) {
          throw new ConflictException(
            'New password must be different from your current password',
          );
        }
      }

      const passwordHash = await this.passwordService.hash(newPassword);

      await this.usersService.updatePassword(
        user.id,
        user.companyId,
        passwordHash,
        manager,
      );

      await this.sessionService.deleteAllForUser(user.id, manager);

      return this.sessionService.createSession(user, metadata, manager);
    });
  }
}
