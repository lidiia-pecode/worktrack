import {
  IsEmail,
  // IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Matches(/^[a-zA-Z0-9_]+$/)
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : null,
  )
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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : null,
  )
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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : null,
  )
  @IsEmail()
  email!: string;
}

export class GoogleUserPayload {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : null,
  )
  @IsEmail()
  email!: string;

  @IsString()
  googleId!: string;
}
