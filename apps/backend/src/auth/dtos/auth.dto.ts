// apps/backend/src/auth/auth.dto.ts

import {
  IsEmail,
  // IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';
import { AuthContext } from '../auth-strategies/types';

export class SignUpPayload {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  lastName!: string;

  @NormalizeString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'CompanyName can contain only letters, numbers, and underscores',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  companyName!: string;

  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, {
    message: 'Password need to contain at least 1 Cap letter and 1 number',
  })
  password!: string;

  // @IsInt()
  // code!: number;
}

export class SignInPayload {
  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, {
    message: 'Password need to contain at least 1 Cap letter and 1 number',
  })
  password!: string;
}

export class VerificationCodeRequestPayload {
  @NormalizeString()
  @IsEmail()
  email!: string;
}

export class GoogleUserPayload {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsString()
  googleId!: string;
}

export class CompleteGoogleSignupDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName!: string;

  @IsNotEmpty()
  @IsString()
  token!: string;
}

export type GoogleLinkRequest = Request & {
  user: GoogleUserPayload;
  authContext: AuthContext;
};
