import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { OptionalNotNull } from 'src/lib/decorators';
import { PersonName } from 'src/lib/validators/account-fields';

export class UpdateUserPayload {
  @OptionalNotNull()
  @PersonName('First name')
  firstName?: string;

  @OptionalNotNull()
  @PersonName('Last name')
  lastName?: string;

  @OptionalNotNull()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;
}
