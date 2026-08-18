import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from 'src/users/entities/user.entity';
import { Company } from 'src/companies/entities/company.entity';
import { GoogleSignupToken } from '../entities/google-signup-token.entity';
import { GoogleLinkToken } from '../entities/google-link-token.entity';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';

import { SessionMetadata } from 'src/lib/types/session-metadata';
import { GoogleLoginResult } from '../auth-strategies/types';
import { GoogleUserPayload } from '../dtos/auth.dto';

import { CompaniesService } from 'src/companies/companies.service';
import { AuthPolicyService } from './auth-policy.service';
import { PasswordService } from './password.service';
import { UsersService } from 'src/users/users.service';
import { SessionService } from './session.service';
import { isDatabaseConflictError } from 'src/lib/utils/is-db-conflict-error';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly dataSource: DataSource,
    private readonly authPolicyService: AuthPolicyService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,

    @InjectRepository(GoogleSignupToken)
    private readonly googleSignupTokenRepository: Repository<GoogleSignupToken>,

    @InjectRepository(GoogleLinkToken)
    private readonly googleLinkTokenRepository: Repository<GoogleLinkToken>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async consumeGoogleSignupToken(
    rawToken: string,
    manager: EntityManager,
  ): Promise<GoogleUserPayload> {
    if (!rawToken) {
      throw new BadRequestException('Google signup token is required.');
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const tokenRepository = manager.getRepository(GoogleSignupToken);

    const result = await tokenRepository
      .createQueryBuilder()
      .update(GoogleSignupToken)
      .set({ usedAt: now })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();

    if (result.affected !== 1) {
      throw new BadRequestException('Invalid or expired Google signup token.');
    }

    const token = await tokenRepository.findOne({ where: { tokenHash } });
    if (!token) {
      throw new BadRequestException('Google signup token could not be loaded.');
    }

    return {
      email: token.email,
      firstName: token.firstName,
      lastName: token.lastName,
      googleId: token.googleId,
    };
  }

  async createGoogleSignupToken(payload: GoogleUserPayload): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>('auth.google.tokenExpiresInMs'),
    );

    const token = this.googleSignupTokenRepository.create({
      tokenHash,
      email: this.authPolicyService.normalizeEmail(payload.email),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      googleId: payload.googleId,
      expiresAt,
      usedAt: null,
    });

    try {
      await this.googleSignupTokenRepository.save(token);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        return this.createGoogleSignupToken(payload);
      }
      throw error;
    }

    return rawToken;
  }

  async validateGoogleLogin(
    googleUser: GoogleUserPayload,
  ): Promise<GoogleLoginResult> {
    const { googleId, email } = googleUser;

    const user = await this.usersService.findByGoogleIdWithCompany(googleId);

    if (!user) {
      const normalizedEmail = this.authPolicyService.normalizeEmail(email);

      const existingUser =
        await this.usersService.findByEmailWithCompany(normalizedEmail);

      if (existingUser && existingUser.passwordHash) {
        return {
          type: 'link',
          userId: existingUser.id,
          googleId,
        };
      }

      return {
        type: 'signup',
        googleUser,
      };
    }

    this.authPolicyService.validateUserAccess(user);

    return {
      type: 'login',
      user,
    };
  }

  // --- GOOGLE LINKING ---

  async createGoogleLinkToken(
    userId: string,
    googleId: string,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>('auth.google.tokenExpiresInMs'),
    );

    const tokenRecord = this.googleLinkTokenRepository.create({
      tokenHash,
      userId,
      googleId,
      expiresAt,
      usedAt: null,
    });

    try {
      await this.googleLinkTokenRepository.save(tokenRecord);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        return this.createGoogleLinkToken(userId, googleId);
      }
      throw error;
    }

    return rawToken;
  }

  private async consumeGoogleLinkToken(
    rawToken: string,
    manager: EntityManager,
  ): Promise<{ userId: string; googleId: string }> {
    if (!rawToken) {
      throw new BadRequestException('Google link token is required.');
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const tokenRepository = manager.getRepository(GoogleLinkToken);

    const result = await tokenRepository
      .createQueryBuilder()
      .update(GoogleLinkToken)
      .set({ usedAt: now })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();

    if (result.affected !== 1) {
      throw new BadRequestException('Invalid or expired Google link token.');
    }

    const token = await tokenRepository.findOne({ where: { tokenHash } });
    if (!token) {
      throw new BadRequestException('Google link token could not be loaded.');
    }

    return { userId: token.userId, googleId: token.googleId };
  }

  async completeGoogleLinkWithPassword(
    rawToken: string,
    password: string,
    metadata?: SessionMetadata,
  ) {
    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const { userId, googleId } = await this.consumeGoogleLinkToken(
          rawToken,
          manager,
        );
        const userRepository = manager.getRepository(User);

        const userEntity = await userRepository.findOne({
          where: { id: userId },
        });
        if (!userEntity || !userEntity.passwordHash) {
          throw new UnauthorizedException('Invalid user account');
        }

        const isPasswordValid = await this.passwordService.verify(
          password,
          userEntity.passwordHash,
        );
        if (!isPasswordValid) {
          throw new BadRequestException('Incorrect password');
        }

        const existingGoogleUser = await userRepository.findOne({
          where: { googleId },
        });
        if (existingGoogleUser && existingGoogleUser.id !== userId) {
          throw new ConflictException(
            'This Google account is already linked to another user.',
          );
        }

        userEntity.googleId = googleId;
        return userRepository.save(userEntity);
      });

      return this.sessionService.createSession(user, metadata);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'This Google account is already linked to another user.',
        );
      }
      throw error;
    }
  }

  async completeGoogleSignup(
    rawToken: string,
    companyName: string,
    metadata?: SessionMetadata,
  ) {
    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const companyRepository = manager.getRepository(Company);

        const payload = await this.consumeGoogleSignupToken(rawToken, manager);

        const email = this.authPolicyService.normalizeEmail(payload.email);

        const company = await this.companiesService.create(
          companyName,
          companyRepository,
        );

        const newUser = userRepository.create({
          companyId: company.id,
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email,
          googleId: payload.googleId,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
        });

        return userRepository.save(newUser);
      });

      return this.sessionService.createSession(user, metadata);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'An account with this email or Google profile already exists.',
        );
      }
      throw error;
    }
  }

  async completeGoogleLink(
    userId: string,
    googleUser: GoogleUserPayload,
  ): Promise<void> {
    const user = await this.usersService.findUserByIdWithCompany(userId);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.authPolicyService.validateUserAccess(user);

    if (
      this.authPolicyService.normalizeEmail(user.email) !==
      this.authPolicyService.normalizeEmail(googleUser.email)
    ) {
      throw new ConflictException(
        'Google account email must match your account email',
      );
    }

    try {
      await this.usersService.linkGoogleAccount(userId, googleUser.googleId);
    } catch (error: unknown) {
      if (isDatabaseConflictError(error)) {
        throw new ConflictException(
          'This Google account is already linked to another user.',
        );
      }
      throw error;
    }
  }
}
