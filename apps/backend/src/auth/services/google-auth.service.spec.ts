import 'reflect-metadata';
import { QueryFailedError } from 'typeorm';

import { AuthErrorCode } from '../auth-error';
import { AuthPolicyService } from './auth-policy.service';
import { GoogleAuthService } from './google-auth.service';

const stub = <T>(value: unknown): T => value as T;

const uniqueViolation = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505' }),
  );

describe('GoogleAuthService token creation', () => {
  const googleUser = {
    email: 'person@google-auth.test',
    firstName: 'Person',
    lastName: 'Test',
    googleId: 'google-id',
  };

  const createService = (save: jest.Mock) => {
    const repository = { create: (value: unknown) => value, save };

    return new GoogleAuthService(
      stub({}),
      stub({}),
      stub({}),
      stub({}),
      new AuthPolicyService(),
      stub({ getOrThrow: () => 60_000 }),
      stub({}),
      stub(repository),
      stub(repository),
    );
  };

  it('retries with a new token when the hash collides', async () => {
    const save = jest
      .fn()
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValue(undefined);

    const token = await createService(save).createGoogleSignupToken(googleUser);

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(save).toHaveBeenCalledTimes(2);

    const [first, second] = save.mock.calls.map(
      ([record]: [{ tokenHash: string }]) => record.tokenHash,
    );
    expect(first).not.toBe(second);
  });

  it('gives up after a bounded number of collisions', async () => {
    const save = jest.fn().mockRejectedValue(uniqueViolation());

    await expect(
      createService(save).createGoogleLinkToken('user-id', 'google-id'),
    ).rejects.toBeInstanceOf(QueryFailedError);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    const save = jest.fn().mockRejectedValue(new Error('connection lost'));

    await expect(
      createService(save).createGoogleSignupToken(googleUser),
    ).rejects.toThrow('connection lost');
    expect(save).toHaveBeenCalledTimes(1);
  });
});

const GOOGLE_USER = {
  email: 'Emma.Clarke@example.com',
  firstName: 'Emma',
  lastName: 'Clarke',
  googleId: 'google-new',
};

describe('GoogleAuthService.validateGoogleLogin', () => {
  const serviceFor = (existingUser: unknown) =>
    new GoogleAuthService(
      stub({}),
      stub({
        findByGoogleIdWithCompany: jest.fn().mockResolvedValue(null),
        findByEmailWithCompany: jest.fn().mockResolvedValue(existingUser),
      }),
      stub({}),
      stub({}),
      new AuthPolicyService(),
      stub({}),
      stub({}),
      stub({}),
      stub({}),
    );

  it('offers linking to an account with a password', async () => {
    const service = serviceFor({ id: 'user-1', passwordHash: 'hash' });

    await expect(service.validateGoogleLogin(GOOGLE_USER)).resolves.toEqual({
      type: 'link',
      userId: 'user-1',
      googleId: 'google-new',
    });
  });

  it('refuses a Google-only account signed in with another Google account', async () => {
    const service = serviceFor({ id: 'user-1', passwordHash: null });

    await expect(
      service.validateGoogleLogin(GOOGLE_USER),
    ).rejects.toMatchObject({
      response: { code: AuthErrorCode.ACCOUNT_USES_OTHER_GOOGLE },
    });
  });

  it('treats an unknown address as a sign-up', async () => {
    const service = serviceFor(null);

    await expect(service.validateGoogleLogin(GOOGLE_USER)).resolves.toEqual({
      type: 'signup',
      googleUser: GOOGLE_USER,
    });
  });
});

describe('GoogleAuthService.completeGoogleLinkWithPassword', () => {
  /** A link token that `consumed` says was or was not still usable. */
  const serviceFor = (consumed: boolean, isPasswordValid = true) => {
    const tokenQuery = {
      update: () => tokenQuery,
      set: () => tokenQuery,
      where: () => tokenQuery,
      andWhere: () => tokenQuery,
      execute: () => Promise.resolve({ affected: consumed ? 1 : 0 }),
    };

    const repositories: Record<string, unknown> = {
      GoogleLinkToken: {
        createQueryBuilder: () => tokenQuery,
        findOne: () => Promise.resolve({ userId: 'user-1', googleId: 'g-1' }),
      },
      User: {
        findOne: () => Promise.resolve({ id: 'user-1', passwordHash: 'hash' }),
      },
    };

    const manager = {
      getRepository: (entity: { name: string }) => repositories[entity.name],
    };

    return new GoogleAuthService(
      stub({ verify: jest.fn().mockResolvedValue(isPasswordValid) }),
      stub({}),
      stub({}),
      stub({
        transaction: (work: (manager: unknown) => Promise<unknown>) =>
          work(manager),
      }),
      new AuthPolicyService(),
      stub({}),
      stub({}),
      stub({}),
      stub({}),
    );
  };

  it('returns a wrong password as an error on the password field', async () => {
    const service = serviceFor(true, false);

    await expect(
      service.completeGoogleLinkWithPassword('token', 'wrong'),
    ).rejects.toMatchObject({
      response: { errors: { password: ['Incorrect password'] } },
    });
  });

  it('says how to start again when the link cannot be used', async () => {
    const service = serviceFor(false);

    await expect(
      service.completeGoogleLinkWithPassword('token', 'Password1'),
    ).rejects.toThrow('sign-in page');
  });
});
