import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { PersonName } from 'src/lib/validators/account-fields';

export class UpdateUserPayload {
  @IsOptional()
  @PersonName('First name')
  firstName?: string;

  @IsOptional()
  @PersonName('Last name')
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;
}
