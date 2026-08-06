import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { TeamStatus } from '../entities/team.entity';
import { TeamRole } from '../entities/team-membership.entity';

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

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
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
  @IsDateString()
  leftAt?: string | null;
}
