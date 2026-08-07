import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { TeamStatus } from '../enums/team-status.enum';
import { TeamRole } from '../enums/team-role.enum';

export class CreateTeamDto {
  @NormalizeString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
}

export class UpdateTeamDto {
  @NormalizeString()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;
}

export class TeamsQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}

export class AddTeamMemberDto {
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(TeamRole)
  roleInTeam?: TeamRole = TeamRole.MEMBER;

  @IsNotEmpty()
  @IsDateString()
  joinedAt!: string;

  @IsOptional()
  @IsDateString()
  leftAt?: string;
}

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsEnum(TeamRole)
  roleInTeam?: TeamRole;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  leftAt?: string | null;
}
