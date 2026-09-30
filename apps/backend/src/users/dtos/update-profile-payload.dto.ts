import { IsOptional, IsString } from 'class-validator';
import { PersonName } from 'src/lib/validators/account-fields';

export class UpdateProfilePayload {
  @IsOptional()
  @PersonName('First name')
  firstName?: string;

  @IsOptional()
  @PersonName('Last name')
  lastName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
