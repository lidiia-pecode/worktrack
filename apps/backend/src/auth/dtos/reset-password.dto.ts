import { IsEmail, IsString, MinLength } from 'class-validator';

import { NewPassword } from 'src/lib/validators/account-fields';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @NewPassword()
  newPassword!: string;
}
