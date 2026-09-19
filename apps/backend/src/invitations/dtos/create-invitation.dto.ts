import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';

import { UserRole } from 'src/users/enums/user-role.enum';

export class CreateInvitationPayload {
  @NormalizeString()
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
