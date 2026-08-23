// apps/backend/src/auth/auth.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';
import { AuthContext } from '../auth-strategies/types';
import { TrimString } from 'src/lib/decorators/trim-string.decorator';

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

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @TrimString()
  @Matches(/^[a-zA-Z0-9_ ]+$/, {
    message:
      'Company name can contain only letters, numbers, spaces, and underscores',
  })
  companyName!: string;

  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, {
    message: 'Password needs to contain at least 1 capital letter and 1 number',
  })
  password!: string;
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
