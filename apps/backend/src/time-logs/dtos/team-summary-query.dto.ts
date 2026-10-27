import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

// A query value arrives as text; anything but "true" or "false" is left for
// IsBoolean to refuse.
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

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

  /** Each day also lists its entries (Team time's cells). */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeEntries?: boolean;
}
