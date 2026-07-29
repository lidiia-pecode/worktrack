import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/UserRole.enum';
import { NormalizeString } from 'src/lib/decorators';

export class CreateUserPayload {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  lastName!: string;

  @NormalizeString()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can contain only letters, numbers, and underscores',
  })
  username?: string;

  @NormalizeString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/, {
    message: 'Password need to contain at least 1 Cap letter and 1 number',
  })
  password!: string;
}

export class UpdateUserPayload {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;
}
