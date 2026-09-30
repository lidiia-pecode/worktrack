import 'reflect-metadata';
import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthErrorCode } from './auth-error';
import type { GoogleAuthService } from './services/google-auth.service';

const stub = <T>(value: unknown): T => value as T;

const GOOGLE_USER = {
  email: 'liam.turner@example.com',
  firstName: 'Liam',
  lastName: 'Turner',
  googleId: 'google-liam',
};

describe('AuthController Google sign-in and sign-up', () => {
  let redirect: jest.Mock;
  let controller: AuthController;

  beforeEach(() => {
    redirect = jest.fn();

    controller = new AuthController(
      stub({}),
      stub({}),
      stub<GoogleAuthService>({
        validateGoogleLogin: jest
          .fn()
          .mockResolvedValue({ type: 'signup', googleUser: GOOGLE_USER }),
        createGoogleSignupToken: jest.fn().mockResolvedValue('signup-token'),
      }),
      stub({}),
      stub<ConfigService>({ getOrThrow: () => 'http://app.test' }),
    );
  });

  const res = () => stub<Response>({ redirect });

  it('refuses an unknown account on the sign-in path', async () => {
    await expect(
      controller.googleLoginCallback(GOOGLE_USER, {}, res()),
    ).rejects.toMatchObject({
      response: { code: AuthErrorCode.GOOGLE_NO_ACCOUNT },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('lets an unknown account start a company on the sign-up path', async () => {
    await controller.googleSignupCallback(GOOGLE_USER, {}, res());

    expect(redirect).toHaveBeenCalledWith(
      'http://app.test/google/signup?token=signup-token',
    );
  });
});
