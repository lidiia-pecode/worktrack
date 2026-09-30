import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

import { TrimString } from 'src/lib/decorators';

// One rule for every password: sign-up, invitation, reset and settings
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/;
const PASSWORD_RULES_MESSAGE = `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters, with an uppercase letter, a lowercase letter and a number`;

const PERSON_NAME_MAX_LENGTH = 100;
const COMPANY_NAME_MIN_LENGTH = 2;
const COMPANY_NAME_MAX_LENGTH = 100;

export const NewPassword = () =>
  applyDecorators(
    IsString({ message: PASSWORD_RULES_MESSAGE }),
    Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
      message: PASSWORD_RULES_MESSAGE,
    }),
    Matches(PASSWORD_PATTERN, { message: PASSWORD_RULES_MESSAGE }),
  );

export const ExistingPassword = () =>
  applyDecorators(
    IsString({ message: 'Enter your password' }),
    IsNotEmpty({ message: 'Enter your password' }),
  );

export const PersonName = (label: string) =>
  applyDecorators(
    TrimString(),
    IsString({ message: `${label} is required` }),
    Length(1, PERSON_NAME_MAX_LENGTH, {
      message: `${label} must be 1–${PERSON_NAME_MAX_LENGTH} characters`,
    }),
  );

export const CompanyName = () =>
  applyDecorators(
    TrimString(),
    IsString({ message: 'Company name is required' }),
    Length(COMPANY_NAME_MIN_LENGTH, COMPANY_NAME_MAX_LENGTH, {
      message: `Company name must be ${COMPANY_NAME_MIN_LENGTH}–${COMPANY_NAME_MAX_LENGTH} characters`,
    }),
  );
