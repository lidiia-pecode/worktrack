import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';

export class UpdateProfilePayload {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @NormalizeString()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // @IsOptional()
  // @MinLength(8)
  // @MaxLength(100)
  // @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
  // password?: string;
}
