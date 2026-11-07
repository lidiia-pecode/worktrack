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
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { TeamStatus } from '../enums/team-status.enum';

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

/** Adds a member; a team's manager is appointed with `ChangeTeamManagerDto`. */
export class AddTeamMemberDto {
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  /**
   * A person is in one team at a time. Adding someone from another team is
   * refused unless the caller says they leave it, in which case the old
   * membership ends the day this one starts.
   */
  @IsOptional()
  @IsBoolean()
  leaveCurrentTeam?: boolean;

  /** The first day on the team: today unless given, and never after it. */
  @IsOptional()
  @IsDateWithoutTimeString()
  date?: string;
}

export class RemoveTeamMemberQuery {
  /** The first day off the team: today unless given, and never after it. */
  @IsOptional()
  @IsDateWithoutTimeString()
  date?: string;
}

/** What happens to a team's current manager when it gets a new one. */
export enum PreviousManager {
  STAYS_AS_MEMBER = 'MEMBER',
  LEAVES = 'LEAVE',
}

export class ChangeTeamManagerDto {
  /** One of the team's members, or a Manager in no team. */
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  /** Required when the team has a manager: they stay as a member or leave the team today. */
  @IsOptional()
  @IsEnum(PreviousManager)
  previousManager?: PreviousManager;
}
