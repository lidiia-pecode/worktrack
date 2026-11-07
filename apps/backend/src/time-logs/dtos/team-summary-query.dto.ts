import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { toBoolean } from 'src/lib/dtos/to-boolean.transform';

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

  /** Each day also lists its entries (Team time's cells); a month at most. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeEntries?: boolean;
}
