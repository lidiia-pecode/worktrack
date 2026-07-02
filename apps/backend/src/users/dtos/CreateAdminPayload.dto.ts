import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '../enums/UserRole.enum';

export class CreateAdminPayloadDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;
}
