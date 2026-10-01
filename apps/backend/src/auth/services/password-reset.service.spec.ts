import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';

import { PasswordResetToken } from '../entities/password-reset-token.entity';
import {
  NO_ACCOUNT_FOR_EMAIL,
  PasswordResetService,
} from './password-reset.service';

const stub = <T>(value: unknown): T => value as T;

describe('PasswordResetService.requestPasswordReset', () => {
  const sendPasswordResetEmail = jest.fn();
  const findByEmailWithCompany = jest.fn();

  const service = new PasswordResetService(
    stub<Repository<PasswordResetToken>>({
      delete: jest.fn(),
      create: (token: object) => token,
      save: jest.fn(),
    }),
    stub<ConfigService>({
      getOrThrow: (key: string) =>
        key === 'app.frontendUrl' ? 'http://localhost:3000' : 3_600_000,
    }),
    stub<MailService>({ sendPasswordResetEmail }),
    stub<UsersService>({ findByEmailWithCompany }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('says there is no account for an unknown email and sends nothing', async () => {
    findByEmailWithCompany.mockResolvedValue(null);

    const request = service.requestPasswordReset('nobody@example.com');

    await expect(request).rejects.toBeInstanceOf(NotFoundException);
    await expect(request).rejects.toThrow(NO_ACCOUNT_FOR_EMAIL);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('emails a reset link to an existing account', async () => {
    findByEmailWithCompany.mockResolvedValue({
      id: 'user-1',
      email: 'emma.clarke@example.com',
    });

    await service.requestPasswordReset('emma.clarke@example.com');

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'emma.clarke@example.com',
      expect.stringContaining('http://localhost:3000/reset-password?token='),
    );
  });
});
