import { IsString, MinLength } from 'class-validator';

import { NewPassword, PersonName } from 'src/lib/validators/account-fields';

export class CompleteInvitationDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @NewPassword()
  password!: string;

  @PersonName('First name')
  firstName!: string;

  @PersonName('Last name')
  lastName!: string;
}
