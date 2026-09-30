import { IsString } from 'class-validator';

import { ExistingPassword } from 'src/lib/validators/account-fields';

export class CompleteGoogleLinkDto {
  @IsString()
  token!: string;

  @ExistingPassword()
  password!: string;
}
