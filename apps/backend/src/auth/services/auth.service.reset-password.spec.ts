import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { UserStatus } from 'src/users/enums/user-role.enum';

import { AuthErrorCode } from '../auth-error';
import { AuthPolicyService } from './auth-policy.service';
import { AuthService } from './auth.service';

const stub = <T>(value: unknown): T => value as T;

describe('AuthService.resetPassword', () => {
  const updatePassword = jest.fn();
  const createSession = jest.fn();

  const service = new AuthService(
    stub({ hash: jest.fn(), verify: jest.fn() }),
    stub({ consumeToken: jest.fn().mockResolvedValue({ userId: 'user-1' }) }),
    stub({}),
    stub({}),
    stub({ deleteAllForUser: jest.fn(), createSession }),
    stub({
      findUserByIdWithCompany: jest.fn().mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        status: UserStatus.DEACTIVATED,
        passwordHash: null,
      }),
      updatePassword,
    }),
    stub({}),
    new AuthPolicyService(),
    stub<DataSource>({
      transaction: (work: (manager: object) => Promise<unknown>) => work({}),
    }),
    stub({}),
  );

  it('refuses a deactivated account before changing the password or opening a session', async () => {
    await expect(
      service.resetPassword('token', 'new-password-1', {}),
    ).rejects.toMatchObject({
      response: { code: AuthErrorCode.ACCOUNT_INACTIVE },
    });
    expect(updatePassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});
