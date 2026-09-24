import 'reflect-metadata';
import { QueryFailedError } from 'typeorm';

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
