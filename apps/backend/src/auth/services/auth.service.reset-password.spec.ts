import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { UserStatus } from 'src/users/enums/user-role.enum';

import { AuthErrorCode } from '../auth-error';
import { AuthPolicyService } from './auth-policy.service';
import { AuthService } from './auth.service';

const stub = <T>(value: unknown): T => value as T;

const personWith = (status: UserStatus) => ({
  id: 'user-1',
  companyId: 'company-1',
  status,
  passwordHash: null,
});

describe('AuthService.resetPassword', () => {
  const hash = jest.fn();
  const findUsableToken = jest.fn();
  const findUserByIdWithCompany = jest.fn();
  const updatePassword = jest.fn();
  const createSession = jest.fn();

  const service = new AuthService(
    stub({ hash, verify: jest.fn() }),
    stub({
      findUsableToken,
      consumeToken: jest.fn().mockResolvedValue({ userId: 'user-1' }),
    }),
    stub({}),
    stub({ deleteAllForUser: jest.fn(), createSession }),
    stub({ findUserByIdWithCompany, updatePassword }),
    stub({}),
    new AuthPolicyService(),
    stub<DataSource>({
      transaction: (work: (manager: object) => Promise<unknown>) => work({}),
    }),
    stub({}),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUsableToken.mockResolvedValue({ userId: 'user-1' });
  });

  it('refuses a deactivated account before hashing the password', async () => {
    findUserByIdWithCompany.mockResolvedValue(
      personWith(UserStatus.DEACTIVATED),
    );

    await expect(
      service.resetPassword('token', 'new-password-1', {}),
    ).rejects.toMatchObject({
      response: { code: AuthErrorCode.ACCOUNT_INACTIVE },
    });
    expect(hash).not.toHaveBeenCalled();
  });

  it('refuses an account deactivated while the password was hashed', async () => {
    findUserByIdWithCompany
      .mockResolvedValueOnce(personWith(UserStatus.ACTIVE))
      .mockResolvedValueOnce(personWith(UserStatus.DEACTIVATED));

    await expect(
      service.resetPassword('token', 'new-password-1', {}),
    ).rejects.toMatchObject({
      response: { code: AuthErrorCode.ACCOUNT_INACTIVE },
    });
    expect(updatePassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuses an unusable link before hashing the password', async () => {
    findUsableToken.mockRejectedValue(
      new UnauthorizedException(
        'This reset link has expired or was already used.',
      ),
    );

    await expect(
      service.resetPassword('made-up', 'new-password-1', {}),
    ).rejects.toThrow('expired or was already used');
    expect(hash).not.toHaveBeenCalled();
  });
});
