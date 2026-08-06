import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/UserRole.enum';
import { NormalizeString } from 'src/lib/decorators';

export class CreateUserPayload {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
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

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  capacityHoursPerWeek?: number;
}

export class UpdateUserPayload {
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

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  capacityHoursPerWeek?: number;
}
