import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { User } from 'src/users/entities/user.entity';

import {
  GoogleUserPayload,
  SignInPayload,
  SignUpPayload,
} from '../dtos/auth.dto';

import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { UsersService } from 'src/users/users.service';
import { AuthContext, AuthUser } from '../auth-strategies/types';
import { ConfigService } from '@nestjs/config';
import { SessionMetadata } from 'src/lib/types/session-metadata';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { CompaniesService } from 'src/companies/companies.service';
import { hashPassword } from 'src/lib/utils/hash-password.util';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleSignupToken } from '../entities/google-signup-token.entity';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly dataSource: DataSource,

    @InjectRepository(GoogleSignupToken)
    private readonly googleSignupTokenRepository: Repository<GoogleSignupToken>,
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

  // #region
  // GOOGLE AUTH

  private async consumeGoogleSignupToken(
    rawToken: string,
    manager: EntityManager,
  ): Promise<GoogleUserPayload> {
    if (!rawToken) {
      throw new BadRequestException('Google signup token is required.');
    }

    const tokenHash = this.hashGoogleSignupToken(rawToken);
    const now = new Date();

    const tokenRepository = manager.getRepository(GoogleSignupToken);

    const result = await tokenRepository
      .createQueryBuilder()
      .update(GoogleSignupToken)
      .set({
        usedAt: now,
      })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .execute();

    if (result.affected !== 1) {
      throw new BadRequestException('Invalid or expired Google signup token.');
    }

    const token = await tokenRepository.findOne({
      where: { tokenHash },
    });

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

  private hashGoogleSignupToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createGoogleSignupToken(payload: GoogleUserPayload): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashGoogleSignupToken(rawToken);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const token = this.googleSignupTokenRepository.create({
      tokenHash,
      email: payload.email.toLowerCase().trim(),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      googleId: payload.googleId,
      expiresAt,
      usedAt: null,
    });

    await this.googleSignupTokenRepository.save(token);

    return rawToken;
  }

  async validateGoogleLogin(googleId: string): Promise<User> {
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

  async completeGoogleSignup(
    rawToken: string,
    companyName: string,
    metadata?: SessionMetadata,
  ) {
    const user = await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const companyRepository = manager.getRepository(Company);

      const payload = await this.consumeGoogleSignupToken(rawToken, manager);

      const email = payload.email.toLowerCase().trim();

      const existingUser = await userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      const existingGoogleUser = await userRepository.findOne({
        where: {
          googleId: payload.googleId,
        },
      });

      if (existingGoogleUser) {
        throw new ConflictException(
          'This Google account is already linked to a user.',
        );
      }

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

    return this.createSession(user, metadata);
  }

  async completeGoogleLink(
    userId: string,
    googleUser: GoogleUserPayload,
  ): Promise<void> {
    const user = await this.usersService.findUserByIdWithCompany(userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Company account is suspended. Please contact billing.',
      );
    }

    if (
      user.email.toLowerCase().trim() !== googleUser.email.toLowerCase().trim()
    ) {
      throw new ConflictException(
        'Google account email must match your account email',
      );
    }

    await this.usersService.linkGoogleAccount(userId, googleUser.googleId);
  }

  // #endregion

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

  async signup(payload: SignUpPayload): Promise<User> {
    const email = payload.email.toLowerCase().trim();

    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const companyRepository = manager.getRepository(Company);

      const existingUser = await userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      const company = await this.companiesService.create(
        payload.companyName,
        companyRepository,
      );

      const passwordHash = await hashPassword(payload.password);

      const user = userRepository.create({
        companyId: company.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email,
        passwordHash,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
      });

      return userRepository.save(user);
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.deleteAllForUser(userId);
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
