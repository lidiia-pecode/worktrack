import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/UserRole.enum';

export class CreateUserPayload {
  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;

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

  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/)
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username!: string;

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

export class UpdateUserPayload extends PartialType(
  OmitType(CreateUserPayload, ['email'] as const),
) {}
