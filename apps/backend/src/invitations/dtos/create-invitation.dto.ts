import { IsEmail, IsEnum } from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';

import { UserRole } from 'src/users/enums/UserRole.enum';

export class CreateInvitationPayload {
  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
