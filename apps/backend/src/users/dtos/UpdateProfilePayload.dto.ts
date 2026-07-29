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
  avatarUrl?: string;

  @NormalizeString()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can contain only letters, numbers, and underscores',
  })
  username?: string;

  @IsOptional()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, {
    message: 'Password need to contain at least 1 Cap letter and 1 number',
  })
  password?: string;
}
