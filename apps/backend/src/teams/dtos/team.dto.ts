import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OptionalNotNull, TrimString } from 'src/lib/decorators';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { TeamStatus } from '../enums/team-status.enum';
import { TeamRole } from '../enums/team-role.enum';

export class CreateTeamDto {
  @TrimString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
}

export class UpdateTeamDto {
  @TrimString({ keepNull: true })
  @OptionalNotNull()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;
}

export class TeamsQuery extends SearchablePaginationQuery {
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

  /**
   * A person is a member of one team at a time. Adding a member of another
   * team is refused unless the caller says they leave it, in which case the
   * old membership ends today, the day this one starts.
   */
  @IsOptional()
  @IsBoolean()
  leaveCurrentTeam?: boolean;
}

/** A membership's dates are the server's, so only its role changes. */
export class UpdateTeamMemberDto {
  @OptionalNotNull()
  @IsEnum(TeamRole)
  roleInTeam?: TeamRole;

  /**
   * Switching a membership to Member while the person is a member of another
   * team: they leave it today, as on an add.
   */
  @OptionalNotNull()
  @IsBoolean()
  leaveCurrentTeam?: boolean;
}
