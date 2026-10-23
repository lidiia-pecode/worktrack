import { IsOptional, IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class TeamSummaryQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Only this person, within the people the caller sees (Reports' day grid). */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
