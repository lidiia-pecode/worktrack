import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerStorageService,
} from '@nestjs/throttler';

import { AuthController } from '../auth.controller';
import { AuthPolicyService } from '../services/auth-policy.service';
import { TokenService } from '../services/token.service';
import {
  ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE,
  CLIENT_AUTH_ATTEMPTS_PER_MINUTE,
  REFRESHES_PER_MINUTE,
} from './rate-limit.decorators';
import { createRateLimitOptions } from './rate-limit.options';

const CONFIG: Record<string, string> = {
  'auth.accessToken.secret': 'test-access-secret',
  'auth.accessToken.expiresIn': '15m',
  'auth.refreshToken.secret': 'test-refresh-secret',
  'auth.refreshToken.expiresIn': '30d',
};

type Route = keyof AuthController;

interface FakeRequest {
  ip: string;
  cookies: Record<string, string>;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

describe('Rate limits', () => {
  const tokenService = new TokenService(new JwtService(), {
    getOrThrow: (key: string) => CONFIG[key],
  } as never);

  let guard: ThrottlerGuard;
  let storage: ThrottlerStorageService;

  const contextFor = (route: Route, req: FakeRequest): ExecutionContext =>
    ({
      getClass: () => AuthController,
      getHandler: () => AuthController.prototype[route],
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ header: jest.fn() }),
      }),
    }) as unknown as ExecutionContext;

  const request = (overrides: Partial<FakeRequest> = {}): FakeRequest => ({
    ip: '203.0.113.1',
    cookies: {},
    body: {},
    headers: {},
    ...overrides,
  });

  const signedIn = (sessionId: string, userId = `user-${sessionId}`) =>
    request({
      cookies: {
        access_token: tokenService.createAccessToken({
          id: userId,
          email: 'person@rate-limit.test',
          companyId: 'company',
          role: 'OWNER',
          sessionId,
        }),
      },
    });

  const withRefreshToken = (sessionId: string) =>
    request({
      cookies: {
        refresh_token: tokenService.createRefreshToken({
          id: `user-${sessionId}`,
          companyId: 'company',
          sessionId,
        }),
      },
    });

  const hit = (route: Route, req: FakeRequest) =>
    guard.canActivate(contextFor(route, req));

  const hitTimes = async (times: number, route: Route, req: FakeRequest) => {
    for (let i = 0; i < times; i++) {
      await hit(route, req);
    }
  };

  const wrongPassword = (email: string, ip: string) =>
    request({ ip, body: { email, password: 'wrong' } });

  beforeEach(async () => {
    const reflector = new Reflector();
    storage = new ThrottlerStorageService();

    guard = new ThrottlerGuard(
      createRateLimitOptions(tokenService, new AuthPolicyService(), reflector),
      storage,
      reflector,
    );
    await guard.onModuleInit();
  });

  afterEach(() => storage.onApplicationShutdown());

  describe('signed-in traffic', () => {
    it('counts each session on its own behind one proxy address', async () => {
      await hitTimes(REFRESHES_PER_MINUTE, 'refresh', withRefreshToken('a'));

      await expect(hit('refresh', withRefreshToken('a'))).rejects.toThrow(
        ThrottlerException,
      );
      await expect(hit('refresh', withRefreshToken('b'))).resolves.toBe(true);
    });

    it('reads the session from the access token as well', async () => {
      await hitTimes(REFRESHES_PER_MINUTE, 'refresh', signedIn('a'));

      await expect(hit('refresh', withRefreshToken('a'))).rejects.toThrow(
        ThrottlerException,
      );
    });

    it('ignores a forwarded address the client set itself', async () => {
      await hitTimes(REFRESHES_PER_MINUTE, 'refresh', withRefreshToken('a'));

      const spoofed = withRefreshToken('a');
      spoofed.headers['x-forwarded-for'] = '198.51.100.7';

      await expect(hit('refresh', spoofed)).rejects.toThrow(ThrottlerException);
    });

    it('does not trust a token signed with another secret', async () => {
      const forged = request({
        cookies: {
          access_token: new JwtService().sign(
            { sessionId: 'forged' },
            { secret: 'not-the-secret' },
          ),
        },
      });

      await hitTimes(REFRESHES_PER_MINUTE, 'refresh', forged);

      await expect(hit('refresh', request())).rejects.toThrow(
        ThrottlerException,
      );
    });
  });

  describe('sign-in', () => {
    it('refuses repeated wrong passwords for one account from any address', async () => {
      for (let i = 0; i < ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE; i++) {
        await hit(
          'login',
          wrongPassword('victim@rate-limit.test', `10.0.0.${i}`),
        );
      }

      await expect(
        hit('login', wrongPassword(' Victim@Rate-Limit.test ', '10.0.1.1')),
      ).rejects.toThrow(ThrottlerException);
      await expect(
        hit('login', wrongPassword('other@rate-limit.test', '10.0.1.1')),
      ).resolves.toBe(true);
    });

    it('limits one address trying many accounts', async () => {
      for (let i = 0; i < CLIENT_AUTH_ATTEMPTS_PER_MINUTE; i++) {
        await hit(
          'login',
          wrongPassword(`person-${i}@rate-limit.test`, '10.0.2.1'),
        );
      }

      await expect(
        hit('login', wrongPassword('next@rate-limit.test', '10.0.2.1')),
      ).rejects.toThrow(ThrottlerException);
      await expect(
        hit('login', wrongPassword('next@rate-limit.test', '10.0.2.2')),
      ).resolves.toBe(true);
    });

    it('counts by address even with a valid session cookie', async () => {
      const attempt = (i: number) => {
        const req = signedIn(`session-${i}`);
        req.body = { email: `person-${i}@rate-limit.test`, password: 'wrong' };
        return req;
      };

      for (let i = 0; i < CLIENT_AUTH_ATTEMPTS_PER_MINUTE; i++) {
        await hit('login', attempt(i));
      }

      await expect(hit('login', attempt(99))).rejects.toThrow(
        ThrottlerException,
      );
    });
  });

  describe('changing a password', () => {
    it('is limited per account across sessions', async () => {
      for (let i = 0; i < ACCOUNT_AUTH_ATTEMPTS_PER_MINUTE; i++) {
        await hit('changePassword', signedIn(`session-${i}`, 'owner'));
      }

      await expect(
        hit('changePassword', signedIn('session-new', 'owner')),
      ).rejects.toThrow(ThrottlerException);
      await expect(
        hit('changePassword', signedIn('session-other', 'someone-else')),
      ).resolves.toBe(true);
    });
  });

  it('does not add an account limit to other routes', async () => {
    await hitTimes(REFRESHES_PER_MINUTE, 'refresh', signedIn('a', 'owner'));

    await expect(hit('refresh', signedIn('b', 'owner'))).resolves.toBe(true);
  });
});
