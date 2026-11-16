import 'src/lib/testing/app-env';
import 'reflect-metadata';
import type { AddressInfo } from 'node:net';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';

import { createApp } from 'src/create-app';
import { PasswordService } from 'src/auth/services/password.service';
import { SessionService } from 'src/auth/services/session.service';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';

/**
 * The app over HTTP, as `main.ts` serves it: which routes need a session, and
 * the global pipe, guards and serializer that only a running app applies.
 * Runs against the development database (`make test`) in a throwaway company.
 */

const RUN = Date.now();
const SLUG = `http-test-${RUN}`;
const ANY_ID = '00000000-0000-4000-8000-000000000000';
const APP_START_TIMEOUT_MS = 30_000;
const OWNER_PASSWORD = 'Correct-Horse-1';

/** The routes that answer without a session: signing up, in and back in. */
const PUBLIC_ROUTES = [
  'GET /auth/google/signup',
  'GET /auth/google/signup/callback',
  'POST /auth/google/signup/complete',
  'GET /auth/google',
  'GET /auth/google/callback',
  'POST /auth/google/link/complete',
  'POST /auth/signup',
  'POST /auth/signin',
  'POST /auth/refresh',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'GET /invitations/validate',
  'POST /invitations/complete-password',
  'GET /invitations/google',
  'GET /invitations/google/authorize',
  'GET /invitations/google/callback',
];

/**
 * A Google callback is a browser redirect, so it refuses by sending the
 * person back to the page the flow started from, with an error code.
 */
const REFUSED_BY_REDIRECT: Record<string, string> = {
  'GET /auth/google/link/callback': '/settings',
};

interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** Every route the running app serves, as `METHOD /path`. */
const registeredRoutes = (app: NestExpressApplication): string[] => {
  const { router } = app.getHttpAdapter().getInstance() as {
    router: { stack: RouterLayer[] };
  };

  return router.stack.flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map(
          (method) => `${method.toUpperCase()} ${route.path}`,
        )
      : [],
  );
};

describe('the app over HTTP', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let ownerCookie: string;
  let ownerEmail: string;
  let employeeCookie: string;

  const call = (
    route: string,
    { cookie, body }: { cookie?: string; body?: unknown } = {},
  ) => {
    const [method, path] = route.split(' ');

    return fetch(`${baseUrl}${path.replace(/:\w+/g, ANY_ID)}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  beforeAll(async () => {
    app = await createApp({ logger: ['error'] });
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    const dataSource = app.get(DataSource);
    const company = await dataSource
      .getRepository(Company)
      .save({ companyName: SLUG, slug: SLUG });

    const person = (role: UserRole, firstName: string, lastName: string) =>
      dataSource.getRepository(User).save({
        companyId: company.id,
        role,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}-${RUN}@http.test`,
        passwordHash: 'not-a-real-hash',
        googleId: `google-${firstName.toLowerCase()}-${RUN}`,
        status: UserStatus.ACTIVE,
      });

    const sessionCookie = async (user: User) => {
      const { access_token } = await app.get(SessionService).createSession({
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      });
      return `access_token=${access_token}`;
    };

    const owner = await person(UserRole.OWNER, 'Olivia', 'Bennett');
    ownerEmail = owner.email;
    await dataSource.getRepository(User).update(owner.id, {
      passwordHash: await app.get(PasswordService).hash(OWNER_PASSWORD),
    });
    ownerCookie = await sessionCookie(owner);
    employeeCookie = await sessionCookie(
      await person(UserRole.EMPLOYEE, 'Ethan', 'Brooks'),
    );
  }, APP_START_TIMEOUT_MS);

  afterAll(async () => {
    if (!app) return;
    await app.get(DataSource).getRepository(Company).delete({ slug: SLUG });
    await app.close();
  });

  describe('sessions', () => {
    it('serves every public route', () => {
      expect(registeredRoutes(app)).toEqual(
        expect.arrayContaining(PUBLIC_ROUTES),
      );
    });

    it('refuses every other route without a session', async () => {
      const closed = registeredRoutes(app).filter(
        (route) => !PUBLIC_ROUTES.includes(route),
      );

      const answer = async (route: string) => {
        const response = await call(route);
        const location = response.headers.get('location');
        if (!location) return `${route} ${response.status}`;

        const { pathname, searchParams } = new URL(location);
        return `${route} ${response.status} to ${pathname} with error ${searchParams.has('error')}`;
      };

      const answers = await Promise.all(closed.map(answer));

      expect(answers).toEqual(
        closed.map((route) =>
          REFUSED_BY_REDIRECT[route]
            ? `${route} 302 to ${REFUSED_BY_REDIRECT[route]} with error true`
            : `${route} 401`,
        ),
      );
    });
  });

  describe('signing in', () => {
    it('refuses a form, which a page on another site could post', async () => {
      const response = await fetch(`${baseUrl}/auth/signin`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: ownerEmail,
          password: OWNER_PASSWORD,
        }).toString(),
      });

      expect(response.status).toBe(400);
      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('refuses a password longer than any can be, with the field error', async () => {
      const response = await call('POST /auth/signin', {
        body: { email: ownerEmail, password: 'Aa1'.repeat(34) },
      });
      const body = (await response.json()) as {
        errors: Record<string, string[]>;
      };

      expect(response.status).toBe(400);
      expect(Object.keys(body.errors)).toEqual(['password']);
    });

    it('keeps the session in cookies and out of the answer', async () => {
      const signedIn = await call('POST /auth/signin', {
        body: { email: ownerEmail, password: OWNER_PASSWORD },
      });
      const refreshCookie = signedIn.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .find((cookie) => cookie.startsWith('refresh_token='));

      expect(signedIn.status).toBe(201);
      await expect(signedIn.json()).resolves.toEqual({ success: true });

      const refreshed = await call('POST /auth/refresh', {
        cookie: refreshCookie,
      });

      expect(refreshed.status).toBe(201);
      await expect(refreshed.json()).resolves.toEqual({ success: true });
    });
  });

  it('refuses an employee on an owner route', async () => {
    const response = await call('POST /teams', {
      cookie: employeeCookie,
      body: { name: 'Design' },
    });

    expect(response.status).toBe(403);
  });

  it('answers a payload it does not accept with the field errors', async () => {
    const response = await call('PATCH /users/me/profile', {
      cookie: ownerCookie,
      body: { firstName: 42, nickname: 'Liv' },
    });

    const body = (await response.json()) as {
      statusCode: number;
      errors: Record<string, string[]>;
    };

    expect(response.status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(Object.keys(body.errors).sort()).toEqual(['firstName', 'nickname']);
  });

  it('never sends a password hash or a Google id', async () => {
    const response = await call('GET /users/me', { cookie: ownerCookie });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('email');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('googleId');
    expect(response.headers.has('x-powered-by')).toBe(false);
  });
});
