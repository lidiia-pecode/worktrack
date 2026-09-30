import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { TrimAndLowercase } from 'src/lib/decorators';
import {
  CompanyName,
  ExistingPassword,
  NewPassword,
  PersonName,
} from 'src/lib/validators/account-fields';
import { AuthContext } from '../auth-strategies/types';

export class SignUpPayload {
  @PersonName('First name')
  firstName!: string;

  @PersonName('Last name')
  lastName!: string;

  @CompanyName()
  companyName!: string;

  @TrimAndLowercase()
  @IsEmail()
  email!: string;

  @NewPassword()
  password!: string;
}

export class SignInPayload {
  @TrimAndLowercase()
  @IsEmail()
  email!: string;

  @ExistingPassword()
  password!: string;
}

export class GoogleUserPayload {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @TrimAndLowercase()
  @IsEmail()
  email!: string;

  @IsString()
  googleId!: string;
}

export class CompleteGoogleSignupDto {
  @CompanyName()
  companyName!: string;

  @IsNotEmpty()
  @IsString()
  token!: string;
}

export type GoogleLinkRequest = Request & {
  user: GoogleUserPayload;
  authContext: AuthContext;
};
