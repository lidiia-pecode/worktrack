import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';

import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import type { UsersService } from 'src/users/users.service';

import { AuthErrorCode, authError } from './auth-error';
import { validateGoogleProfile } from './auth-strategies/google';
import { AuthPolicyService } from './services/auth-policy.service';
import { AuthService } from './services/auth.service';
import type { PasswordService } from './services/password.service';

const stub = <T>(value: unknown): T => value as T;

describe('password sign-in', () => {
  const deactivated = stub<User>({
    email: 'olivia.brown@example.com',
    passwordHash: 'hash',
    status: UserStatus.DEACTIVATED,
  });

  const signIn = (password: string) => {
    const service = new AuthService(
      stub<PasswordService>({
        verify: jest.fn((given: string) => Promise.resolve(given === 'right')),
      }),
      stub({}),
      stub({}),
      stub({}),
      stub({}),
      stub<UsersService>({
        findByEmailWithCompany: jest.fn().mockResolvedValue(deactivated),
      }),
      stub({}),
      new AuthPolicyService(),
      stub({}),
      stub({}),
    );

    return service.validateLocalUser({ email: deactivated.email, password });
  };

  it('says only "Invalid credentials" to a wrong password', async () => {
    await expect(signIn('wrong')).rejects.toThrow(UnauthorizedException);
    await expect(signIn('wrong')).rejects.toThrow('Invalid credentials');
  });

  it('says the account is deactivated after the right password', async () => {
    await expect(signIn('right')).rejects.toEqual(
      authError(AuthErrorCode.ACCOUNT_INACTIVE),
    );
  });
});

describe('Google profile', () => {
  const profile = (verified: boolean) =>
    stub<Profile>({
      id: 'google-olivia',
      emails: [{ value: 'olivia.brown@example.com', verified }],
      name: { givenName: 'Olivia', familyName: 'Brown' },
    });

  it('refuses an email address Google has not verified', () => {
    const done = jest.fn();

    validateGoogleProfile(profile(false), done);

    expect(done).toHaveBeenCalledWith(
      authError(AuthErrorCode.GOOGLE_EMAIL_UNVERIFIED),
      false,
    );
  });

  it('accepts a verified one', () => {
    const done = jest.fn();

    validateGoogleProfile(profile(true), done);

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ email: 'olivia.brown@example.com' }),
    );
  });
});
