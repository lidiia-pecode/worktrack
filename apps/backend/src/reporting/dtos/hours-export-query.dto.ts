import { IsOptional, IsUUID } from 'class-validator';

import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class HoursExportQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;

  /** Only the current members of this team, within the people the caller sees. */
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
