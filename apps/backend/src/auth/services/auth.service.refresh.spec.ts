import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';
import { Company } from 'src/companies/entities/company.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { hashPassword } from 'src/lib/utils/hash-password.util';

import { AuthSession } from '../entities/auth-session.entity';
import type { AuthContext, AuthUser } from '../auth-strategies/types';
import { AuthPolicyService } from './auth-policy.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

/**
 * Refresh rotation relies on an atomic update, so these run against the
 * development database: `make test`. Everything is created under a throwaway
 * company.
 */

const RUN = Date.now();
const SLUG = `auth-refresh-test-${RUN}`;
const PASSWORD = 'password123';
const REUSE_GRACE_MS = 30_000;
const CONCURRENT_REFRESHES = 5;

const CONFIG: Record<string, unknown> = {
  'auth.accessToken.secret': 'test-access-secret',
  'auth.accessToken.expiresIn': '15m',
  'auth.refreshToken.secret': 'test-refresh-secret',
  'auth.refreshToken.hashSecret': 'test-refresh-hash-secret',
  'auth.refreshToken.expiresIn': '30d',
  'auth.refreshToken.maxAgeMs': 30 * 24 * 60 * 60 * 1000,
  'auth.refreshToken.reuseGraceMs': REUSE_GRACE_MS,
};

const stub = <T>(value: unknown): T => value as T;

describe('AuthService refresh', () => {
  let dataSource: DataSource;
  let service: AuthService;
  let tokenService: TokenService;
  let jwt: JwtService;

  let companyId: string;
  let user: AuthUser;

  const sessionRepo = () => dataSource.getRepository(AuthSession);

  const findSession = (id: string) => sessionRepo().findOneBy({ id });

  /**
   * Signed a minute in the past, as a real sign-in would be: two refresh
   * tokens signed in the same second with the same payload are identical.
   */
  const signIn = async (): Promise<{ sessionId: string; token: string }> => {
    const session = await sessionRepo().save({
      userId: user.id,
      companyId,
      refreshHash: 'pending',
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const token = jwt.sign(
      {
        id: user.id,
        companyId,
        sessionId: session.id,
        iat: Math.floor(Date.now() / 1000) - 60,
      },
      {
        secret: CONFIG['auth.refreshToken.secret'] as string,
        expiresIn: '30d',
      },
    );

    await sessionRepo().update(session.id, {
      refreshHash: tokenService.hashRefreshToken(token, session.id),
    });

    return { sessionId: session.id, token };
  };

  const authFor = (sessionId: string): AuthContext => ({ user, sessionId });

  const refresh = (token: string, sessionId: string) =>
    service.refreshAccessToken(token, authFor(sessionId));

  beforeAll(async () => {
    dataSource = await new DataSource({
      ...AppDataSource.options,
      logging: false,
    }).initialize();

    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });
    companyId = company.id;

    const email = `owner-${RUN}@auth-refresh.test`;
    const saved = await dataSource.getRepository(User).save({
      companyId,
      role: UserRole.OWNER,
      firstName: 'Owner',
      lastName: 'Test',
      email,
      status: UserStatus.ACTIVE,
      passwordHash: await hashPassword(PASSWORD),
    });
    user = { id: saved.id, email, companyId, role: UserRole.OWNER };

    const config = stub<never>({ getOrThrow: (key: string) => CONFIG[key] });
    const teamVisibility = new TeamVisibilityService(
      dataSource.getRepository(TeamMembership),
      dataSource.getRepository(User),
    );
    const usersService = new UsersService(
      dataSource.getRepository(User),
      teamVisibility,
      dataSource,
    );

    jwt = new JwtService();
    tokenService = new TokenService(jwt, config);
    const sessionService = new SessionService(
      config,
      tokenService,
      sessionRepo(),
    );

    service = new AuthService(
      new PasswordService(),
      stub({
        consumeToken: jest.fn().mockResolvedValue({ userId: user.id }),
      }),
      stub({}),
      tokenService,
      sessionService,
      usersService,
      stub({}),
      new AuthPolicyService(),
      dataSource,
      config,
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;

    await dataSource.getRepository(Company).delete({ slug: SLUG });

    await dataSource.destroy();
  });

  describe('concurrent refreshes with the same token', () => {
    it('all succeed, issue one refresh token and keep the session', async () => {
      const { sessionId, token } = await signIn();

      const results = await Promise.all(
        Array.from({ length: CONCURRENT_REFRESHES }, () =>
          refresh(token, sessionId),
        ),
      );

      results.forEach((result) => expect(result.access_token).toBeTruthy());

      const issued = results.flatMap((result) =>
        result.refresh_token ? [result.refresh_token] : [],
      );
      expect(issued).toHaveLength(1);

      const session = await findSession(sessionId);
      expect(session).not.toBeNull();
      expect(session!.refreshHash).toBe(
        tokenService.hashRefreshToken(issued[0], sessionId),
      );
      expect(session!.previousRefreshHash).toBe(
        tokenService.hashRefreshToken(token, sessionId),
      );
    });

    it('a late one leaves the first rotation in place', async () => {
      const { sessionId, token } = await signIn();

      const first = await refresh(token, sessionId);
      const late = await refresh(token, sessionId);
      expect(late.refresh_token).toBeUndefined();

      const session = await findSession(sessionId);
      expect(session!.refreshHash).toBe(
        tokenService.hashRefreshToken(first.refresh_token!, sessionId),
      );
    });
  });

  describe('reuse of a rotated token', () => {
    it('deletes the session once the grace window has passed', async () => {
      const { sessionId, token } = await signIn();

      await refresh(token, sessionId);
      await sessionRepo().update(sessionId, {
        rotatedAt: new Date(Date.now() - REUSE_GRACE_MS - 1_000),
      });

      await expect(refresh(token, sessionId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(await findSession(sessionId)).toBeNull();
    });

    it('deletes the session for a token older than the previous one', async () => {
      const { sessionId, token } = await signIn();

      await refresh(token, sessionId);
      // Two rotations away from the original token, still inside the window.
      await sessionRepo().update(sessionId, {
        refreshHash: 'rotated-again',
        previousRefreshHash: 'rotated-once',
        rotatedAt: new Date(),
      });

      await expect(refresh(token, sessionId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(await findSession(sessionId)).toBeNull();
    });
  });

  describe('password changes', () => {
    it('a change ends every other session', async () => {
      const current = await signIn();
      const other = await signIn();

      await service.changePassword(user.id, companyId, current.sessionId, {
        currentPassword: PASSWORD,
        newPassword: 'changed-password-1',
      });

      expect(await findSession(current.sessionId)).not.toBeNull();
      expect(await findSession(other.sessionId)).toBeNull();

      await dataSource
        .getRepository(User)
        .update(user.id, { passwordHash: await hashPassword(PASSWORD) });
    });

    it('a reset ends every session', async () => {
      const first = await signIn();
      const second = await signIn();

      await service.resetPassword('reset-token', 'reset-password-1', {});

      expect(await findSession(first.sessionId)).toBeNull();
      expect(await findSession(second.sessionId)).toBeNull();
      expect(await sessionRepo().countBy({ userId: user.id })).toBe(1);
    });
  });
});
