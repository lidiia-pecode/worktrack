import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TrimAndLowercase } from 'src/lib/decorators';

import { UserRole } from 'src/users/enums/user-role.enum';

export class CreateInvitationPayload {
  @TrimAndLowercase()
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
