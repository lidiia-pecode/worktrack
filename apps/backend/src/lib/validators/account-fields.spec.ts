import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CompleteGoogleLinkDto } from 'src/auth/dtos/complete-google-link.dto';
import { ChangePasswordPayload } from 'src/auth/dtos/change-password-payload.dto';
import { ResetPasswordDto } from 'src/auth/dtos/reset-password.dto';
import { CompleteGoogleSignupDto, SignUpPayload } from 'src/auth/dtos/auth.dto';
import { UpdateCompanyDto } from 'src/companies/dtos/update-company.dto';
import { CompleteInvitationDto } from 'src/invitations/dtos/complete-invitation.dto';
import { UpdateProfilePayload } from 'src/users/dtos/update-profile-payload.dto';

const VALID_SIGN_UP = {
  firstName: 'Emma',
  lastName: 'Clarke',
  companyName: 'Clarke Studio',
  email: 'emma.clarke@example.com',
  password: 'Secret123',
};

const VALID_INVITATION = {
  token: 'token',
  firstName: 'Liam',
  lastName: 'Turner',
  password: 'Secret123',
};

const errorFields = async <T extends object>(
  dto: new () => T,
  body: Record<string, unknown>,
) => {
  const errors = await validate(plainToInstance(dto, body));
  return errors.map((error) => error.property);
};

describe('one password rule for every new password', () => {
  it.each(['Secret123', 'aB3xxxxx', `Aa1${'x'.repeat(97)}`])(
    'accepts %s',
    async (password) => {
      await expect(
        errorFields(SignUpPayload, { ...VALID_SIGN_UP, password }),
      ).resolves.toEqual([]);
      await expect(
        errorFields(CompleteInvitationDto, { ...VALID_INVITATION, password }),
      ).resolves.toEqual([]);
      await expect(
        errorFields(ResetPasswordDto, { token: 't', newPassword: password }),
      ).resolves.toEqual([]);
      await expect(
        errorFields(ChangePasswordPayload, { newPassword: password }),
      ).resolves.toEqual([]);
    },
  );

  it.each([
    ['too short', 'Sec123'],
    ['too long', `Aa1${'x'.repeat(98)}`],
    ['no upper-case letter', 'secret123'],
    ['no lower-case letter', 'SECRET123'],
    ['no digit', 'SecretPass'],
  ])('refuses a password with %s', async (_, password) => {
    await expect(
      errorFields(SignUpPayload, { ...VALID_SIGN_UP, password }),
    ).resolves.toEqual(['password']);
    await expect(
      errorFields(CompleteInvitationDto, { ...VALID_INVITATION, password }),
    ).resolves.toEqual(['password']);
    await expect(
      errorFields(ResetPasswordDto, { token: 't', newPassword: password }),
    ).resolves.toEqual(['newPassword']);
    await expect(
      errorFields(ChangePasswordPayload, { newPassword: password }),
    ).resolves.toEqual(['newPassword']);
  });
});

describe('an existing password is only checked for presence', () => {
  it('accepts a password chosen before the rule applied everywhere', async () => {
    await expect(
      errorFields(CompleteGoogleLinkDto, { token: 't', password: 'short' }),
    ).resolves.toEqual([]);
    await expect(
      errorFields(ChangePasswordPayload, {
        currentPassword: 'short',
        newPassword: 'Secret123',
      }),
    ).resolves.toEqual([]);
  });

  it('refuses an empty password', async () => {
    await expect(
      errorFields(CompleteGoogleLinkDto, { token: 't', password: '' }),
    ).resolves.toEqual(['password']);
  });
});

describe('person names', () => {
  it('accepts a one-letter name and trims it', async () => {
    const body = { ...VALID_SIGN_UP, firstName: ' J ', lastName: 'O' };

    await expect(errorFields(SignUpPayload, body)).resolves.toEqual([]);
    expect(plainToInstance(SignUpPayload, body).firstName).toBe('J');
  });

  it('accepts a 100-character name and refuses a longer one', async () => {
    await expect(
      errorFields(CompleteInvitationDto, {
        ...VALID_INVITATION,
        lastName: 'x'.repeat(100),
      }),
    ).resolves.toEqual([]);
    await expect(
      errorFields(UpdateProfilePayload, { lastName: 'x'.repeat(101) }),
    ).resolves.toEqual(['lastName']);
  });

  it('refuses a name of spaces only', async () => {
    await expect(
      errorFields(UpdateProfilePayload, { firstName: '   ' }),
    ).resolves.toEqual(['firstName']);
  });
});

describe('line breaks and invisible characters in names', () => {
  it.each([
    ['a line break', 'Emma\nClarke'],
    ['a tab', 'Emma\tClarke'],
    ['a right-to-left override', 'Emma\u202eekralC'],
    ['a zero-width space', 'Em\u200bma'],
    ['a line separator', 'Emma\u2028Clarke'],
  ])('refuses %s in a person or company name', async (_, name) => {
    await expect(
      errorFields(UpdateProfilePayload, { firstName: name }),
    ).resolves.toEqual(['firstName']);
    await expect(
      errorFields(CompleteInvitationDto, {
        ...VALID_INVITATION,
        lastName: name,
      }),
    ).resolves.toEqual(['lastName']);
    await expect(
      errorFields(UpdateCompanyDto, { companyName: name }),
    ).resolves.toEqual(['companyName']);
  });

  it.each(["O'Brien", 'Anne-Marie', 'Олена', 'José María'])(
    'still accepts %s',
    async (name) => {
      await expect(
        errorFields(UpdateProfilePayload, { firstName: name, lastName: name }),
      ).resolves.toEqual([]);
    },
  );

  it('trims a trailing line break rather than refusing it', async () => {
    await expect(
      errorFields(UpdateProfilePayload, { firstName: 'Emma\n' }),
    ).resolves.toEqual([]);
  });
});

describe('company names', () => {
  it.each(['Smith & Co', 'A.B. Consulting', 'Kyiv-Tech', 'Студія Кларк', 'Q2'])(
    'accepts %s on both sign-up paths and in Settings',
    async (companyName) => {
      await expect(
        errorFields(SignUpPayload, { ...VALID_SIGN_UP, companyName }),
      ).resolves.toEqual([]);
      await expect(
        errorFields(CompleteGoogleSignupDto, { token: 't', companyName }),
      ).resolves.toEqual([]);
      await expect(
        errorFields(UpdateCompanyDto, { companyName }),
      ).resolves.toEqual([]);
    },
  );

  it.each([' A ', 'x'.repeat(101)])('refuses %p', async (companyName) => {
    await expect(
      errorFields(CompleteGoogleSignupDto, { token: 't', companyName }),
    ).resolves.toEqual(['companyName']);
    await expect(
      errorFields(UpdateCompanyDto, { companyName }),
    ).resolves.toEqual(['companyName']);
  });

  it('trims the company name', () => {
    const dto = plainToInstance(CompleteGoogleSignupDto, {
      token: 't',
      companyName: '  Clarke Studio ',
    });

    expect(dto.companyName).toBe('Clarke Studio');
  });
});
