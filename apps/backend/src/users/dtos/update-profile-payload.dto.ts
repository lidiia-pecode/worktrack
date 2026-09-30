import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TrimAndLowercase } from 'src/lib/decorators';
import { PersonName } from 'src/lib/validators/account-fields';

export class UpdateProfilePayload {
  @IsOptional()
  @PersonName('First name')
  firstName?: string;

  @IsOptional()
  @PersonName('Last name')
  lastName?: string;

  @TrimAndLowercase()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
